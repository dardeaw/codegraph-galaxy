"""GalaxyChatProvider — local-LLM chat agent over the code graph (stdlib only).

Thin galaxy-side provider following the RDLib ChatDialog provider shape
(FnChat / FnChatStream) so it can be swapped for an RDLib-backed one later.
Talks to a local Ollama (OpenAI-compatible host, native /api/chat) and only
ever calls the existing graph helpers — no new index, no vectors.

Tools: galaxy_search_symbols / galaxy_get_neighbors / galaxy_get_code /
       galaxy_blast_radius. Every call is recorded into vTrace so the UI can
show "how the LLM looked the code up", and touched node ids become highlights.

Config via env: GALAXY_LLM_URL (default http://127.0.0.1:11434),
                GALAXY_LLM_MODEL (default qwen3.5:9b).
"""
import json
import os
import sqlite3
import urllib.request
from typing import Any, Callable, Dict, Iterator, List, Optional, Tuple

from .graph import extract_code_snippet
from .scanner import get_db_path

LLM_URL = os.environ.get("GALAXY_LLM_URL", "http://127.0.0.1:11434").rstrip("/")
LLM_MODEL = os.environ.get("GALAXY_LLM_MODEL", "qwen3.5:9b")
LLM_PROVIDER = os.environ.get("GALAXY_LLM_PROVIDER", "ollama").strip().lower() or "ollama"
CUSTOM_BASE = os.environ.get("GALAXY_LLM_BASE", "").rstrip("/")
CUSTOM_KEY = os.environ.get("GALAXY_LLM_KEY", "")
CUSTOM_MODEL = os.environ.get("GALAXY_LLM_CUSTOM_MODEL", "")
MAX_ITERS = 6
MAX_SEARCH = 20
MAX_EDGES = 60
MAX_CODE_LINES = 120
FINAL_NUDGE = "已查到足夠資訊，請直接用中文回答原問題，不要再呼叫工具。"

# Session-level default (opencode-like switching; payload override wins).
_SESSION = {"provider": None, "model": None}


def FnSetChatDefault(str_provider: Optional[str] = None, str_model: Optional[str] = None) -> Dict[str, Any]:
    if str_provider:
        _SESSION["provider"] = str(str_provider).strip().lower()
    if str_model:
        _SESSION["model"] = str(str_model).strip()
    return {"provider": _SESSION["provider"], "model": _SESSION["model"]}


def FnGetChatDefault() -> Dict[str, Any]:
    return {"provider": _SESSION["provider"] or LLM_PROVIDER, "model": _SESSION["model"] or LLM_MODEL}


def FnListProviders() -> Dict[str, Any]:
    """Probe local Ollama tags + optional OpenAI-compatible custom endpoint."""
    vProviders: List[Dict[str, Any]] = []
    vOllamaModels: List[str] = []
    try:
        with urllib.request.urlopen(LLM_URL + "/api/tags", timeout=5) as oRes:
            dicTags = json.loads(oRes.read().decode("utf-8"))
        vOllamaModels = [m.get("name") for m in (dicTags.get("models") or []) if m.get("name")]
    except Exception:
        vOllamaModels = []
    if vOllamaModels or True:
        vProviders.append({"id": "ollama", "label": f"Ollama local ({LLM_URL})",
                           "models": vOllamaModels or [LLM_MODEL],
                           "available": bool(vOllamaModels)})
    if CUSTOM_BASE:
        vModels = [m.strip() for m in CUSTOM_MODEL.split(",") if m.strip()] or ["default"]
        vProviders.append({"id": "custom", "label": f"Custom OpenAI-compatible ({CUSTOM_BASE})",
                           "models": vModels, "available": True})
    dicDef = FnGetChatDefault()
    return {"providers": vProviders, "current": dicDef}

SYSTEM_PROMPT = (
    "You are a code assistant inside CodeGraph Galaxy. Answer in the user's language "
    "(Traditional Chinese if the user writes Traditional Chinese). "
    "Use the provided tools to look up the codebase — never invent symbols, files or line numbers. "
    "Keep the final answer concise and reference node ids in backticks like `auth:login`."
)

TOOLS = [
    {"type": "function", "function": {
        "name": "galaxy_search_symbols",
        "description": "Keyword-search symbols (function/class/method/file) by name across the indexed repo.",
        "parameters": {"type": "object", "properties": {
            "keyword": {"type": "string", "description": "Substring to match against name/qualified_name/file_path."},
            "limit": {"type": "integer", "description": "Max hits (1-20)."}},
            "required": ["keyword"]}}},
    {"type": "function", "function": {
        "name": "galaxy_get_neighbors",
        "description": "Expand call-graph neighbors (callers + callees) around a node id.",
        "parameters": {"type": "object", "properties": {
            "node_id": {"type": "string"},
            "depth": {"type": "integer", "description": "1 or 2."}},
            "required": ["node_id"]}}},
    {"type": "function", "function": {
        "name": "galaxy_get_code",
        "description": "Read a source snippet by file path and line range (max 120 lines).",
        "parameters": {"type": "object", "properties": {
            "file_path": {"type": "string"},
            "start_line": {"type": "integer"},
            "end_line": {"type": "integer"}},
            "required": ["file_path"]}}},
    {"type": "function", "function": {
        "name": "galaxy_blast_radius",
        "description": "Impact analysis: all nodes within N hops of a node id (who would break if it changes).",
        "parameters": {"type": "object", "properties": {
            "node_id": {"type": "string"},
            "depth": {"type": "integer", "description": "1 or 2."}},
            "required": ["node_id"]}}},
]


def _connect_db(str_db: str) -> sqlite3.Connection:
    o_conn = sqlite3.connect(str_db)
    o_conn.row_factory = sqlite3.Row
    return o_conn


class GalaxyChatProvider:
    """Local-LLM chat provider. fn_resolve_db(project) -> (db_path, repo_path) | None."""
    def __init__(self, fn_resolve_db: Optional[Callable[[str], Optional[Tuple[str, str]]]] = None,
                 fn_list_projects: Optional[Callable[[], List[str]]] = None,
                 str_model: Optional[str] = None, str_base_url: Optional[str] = None,
                 str_provider: Optional[str] = None) -> None:
        self._fn_resolve_db = fn_resolve_db
        self._fn_list_projects = fn_list_projects
        self._str_model = str_model or LLM_MODEL
        self._str_base = (str_base_url or LLM_URL).rstrip("/")
        self._str_provider = (str_provider or LLM_PROVIDER).strip().lower() or "ollama"

    def _FnResolveTarget(self, str_model: Optional[str], str_provider: Optional[str]) -> Tuple[str, str, str]:
        """(protocol, base_url, model): protocol is 'ollama' or 'openai'."""
        dicDef = FnGetChatDefault()
        strProv = (str_provider or self._str_provider or dicDef["provider"] or "ollama").strip().lower()
        strMod = (str_model or self._str_model or dicDef["model"] or LLM_MODEL).strip()
        if strProv == "custom" and CUSTOM_BASE:
            return "openai", CUSTOM_BASE, strMod
        return "ollama", self._str_base, strMod

    # ---------------- LLM transport (stdlib, ollama-native + openai-compatible) ----------------
    def _FnPostChat(self, vMessages: List[Dict[str, Any]], str_model: Optional[str] = None,
                    str_provider: Optional[str] = None, bStream: bool = False):
        strProto, strBase, strMod = self._FnResolveTarget(str_model, str_provider)
        if strProto == "openai":
            strBody = json.dumps({"model": strMod, "messages": vMessages, "tools": TOOLS,
                                  "stream": bStream, "temperature": 0.2})
            dicHeaders = {"Content-Type": "application/json"}
            if CUSTOM_KEY:
                dicHeaders["Authorization"] = "Bearer " + CUSTOM_KEY
            oReq = urllib.request.Request(strBase + "/chat/completions", data=strBody.encode("utf-8"),
                                          headers=dicHeaders, method="POST")
        else:
            strBody = json.dumps({"model": strMod, "messages": vMessages, "tools": TOOLS,
                                  "stream": bStream,
                                  "options": {"temperature": 0.2, "num_ctx": 8192}})
            oReq = urllib.request.Request(strBase + "/api/chat", data=strBody.encode("utf-8"),
                                          headers={"Content-Type": "application/json"}, method="POST")
        return urllib.request.urlopen(oReq, timeout=300), strProto

    @staticmethod
    def _FnParseNonStream(dicRes: Dict[str, Any], str_proto: str) -> Tuple[str, List[Dict[str, Any]]]:
        """Returns (content, tool_calls[{name, args}]) for either protocol."""
        if str_proto == "openai":
            dicMsg = ((dicRes.get("choices") or [{}])[0].get("message")) or {}
            strContent = dicMsg.get("content") or ""
            vCalls = []
            for dicCall in dicMsg.get("tool_calls") or []:
                dicFn = (dicCall or {}).get("function") or {}
                oArgs = dicFn.get("arguments") or {}
                vCalls.append({"name": str(dicFn.get("name") or ""),
                               "args": json.loads(oArgs) if isinstance(oArgs, str) else (oArgs or {})})
            return strContent, vCalls
        dicMsg = dicRes.get("message") or {}
        strContent = dicMsg.get("content") or ""
        vCalls = []
        for dicCall in dicMsg.get("tool_calls") or []:
            dicFn = (dicCall or {}).get("function") or {}
            oArgs = dicFn.get("arguments") or {}
            vCalls.append({"name": str(dicFn.get("name") or ""),
                           "args": json.loads(oArgs) if isinstance(oArgs, str) else (oArgs or {})})
        return strContent, vCalls

    # ---------------- graph tools (reuse existing helpers) ----------------
    def _FnSearch(self, strDb: str, strKeyword: str, nLimit: int) -> List[Dict[str, Any]]:
        nLimit = max(1, min(MAX_SEARCH, int(nLimit or 8)))
        strLike = f"%{strKeyword}%"
        oConn = _connect_db(strDb)
        try:
            oCur = oConn.cursor()
            vRows = oCur.execute(
                "SELECT id, name, kind, file_path, start_line, qualified_name FROM nodes "
                "WHERE name LIKE ? OR qualified_name LIKE ? OR file_path LIKE ? "
                "ORDER BY kind, name LIMIT ?",
                (strLike, strLike, strLike, nLimit)).fetchall()
            return [dict(r) for r in vRows]
        finally:
            oConn.close()

    def _FnHops(self, strDb: str, strNodeId: str, nDepth: int) -> Dict[str, Any]:
        nDepth = 1 if int(nDepth or 1) < 1 else min(2, int(nDepth or 1))
        oConn = _connect_db(strDb)
        try:
            oCur = oConn.cursor()
            vIds = [strNodeId]
            vSeen = {strNodeId}
            for _ in range(nDepth):
                vRows = oCur.execute(
                    "SELECT source, target FROM edges WHERE source IN (%s) OR target IN (%s)"
                    % (",".join("?" * len(vIds)), ",".join("?" * len(vIds))),
                    (*vIds, *vIds)).fetchall()
                vIds = []
                for r in vRows:
                    for v in (r["source"], r["target"]):
                        if v not in vSeen:
                            vSeen.add(v)
                            vIds.append(v)
                if not vIds:
                    break
            vNodes = []
            if vSeen:
                vNodes = [dict(r) for r in oCur.execute(
                    "SELECT id, name, kind, file_path FROM nodes WHERE id IN (%s) LIMIT %d"
                    % (",".join("?" * len(vSeen)), MAX_EDGES), (*vSeen,)).fetchall()]
            return {"center": strNodeId, "count": len(vSeen) - 1, "nodes": vNodes}
        finally:
            oConn.close()

    def _FnRunTool(self, strName: str, dicArgs: Dict[str, Any], strDb: str, strRepo: str) -> Tuple[Any, str, List[str]]:
        """Returns (result_for_llm, trace_summary, highlight_ids)."""
        if strName == "galaxy_search_symbols":
            vHits = self._FnSearch(strDb, str(dicArgs.get("keyword", "")), int(dicArgs.get("limit", 8) or 8))
            vIds = [h["id"] for h in vHits if h.get("id")]
            strNames = ", ".join(f"`{h['id']}`" for h in vHits[:8]) or "none"
            return vHits, f"命中 {len(vHits)} 個：{strNames}", vIds
        if strName in ("galaxy_get_neighbors", "galaxy_blast_radius"):
            dicRes = self._FnHops(strDb, str(dicArgs.get("node_id", "")), int(dicArgs.get("depth", 1) or 1))
            vIds = [n["id"] for n in dicRes["nodes"] if n.get("id")]
            return dicRes, f"展開 {dicRes['count']} 個相鄰節點", vIds
        if strName == "galaxy_get_code":
            nStart = max(1, int(dicArgs.get("start_line", 1) or 1))
            nEnd = min(nStart + MAX_CODE_LINES, int(dicArgs.get("end_line", nStart + 50) or (nStart + 50)))
            dicSnippet, _ = extract_code_snippet(strRepo, str(dicArgs.get("file_path", "")), nStart, nEnd)
            return dicSnippet, f"讀取 {dicArgs.get('file_path')}:{nStart}-{nEnd}", []
        return {"error": f"unknown tool {strName}"}, "未知工具", []

    # ---------------- target repo ----------------
    def _FnPickDb(self, dicContext: Dict[str, Any]) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """Returns (db_path, repo_path, hint). hint set when user must pick a project."""
        strProject = str((dicContext or {}).get("strProject") or "")
        if strProject and self._fn_resolve_db:
            t = self._fn_resolve_db(strProject)
            if t:
                return t[0], t[1], None
            return None, None, f"找不到專案 {strProject}"
        if self._fn_list_projects and self._fn_resolve_db:
            vNames = [n for n in (self._fn_list_projects() or []) if self._fn_resolve_db(n)]
            if len(vNames) == 1:
                t = self._fn_resolve_db(vNames[0])
                return t[0], t[1], None
            if vNames:
                return None, None, "請先指定專案（庫管理 → 選擇專案），目前有：" + "、".join(vNames[:10])
        return None, None, "尚無已索引的專案，請先到庫管理 init"

    # ---------------- agent loop ----------------
    def _FnLoop(self, strMessage: str, dicContext: Dict[str, Any],
                str_model: Optional[str] = None, str_provider: Optional[str] = None,
                fnOnTrace=None) -> Tuple[str, List[Dict[str, Any]], List[str], Optional[str]]:
        strDb, strRepo, strHint = self._FnPickDb(dicContext or {})
        if strHint:
            return strHint, [], [], None
        vMessages: List[Dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
        for dicMsg in (dicContext or {}).get("vHistory") or []:
            if isinstance(dicMsg, dict) and dicMsg.get("role") in ("user", "assistant"):
                vMessages.append({"role": dicMsg["role"], "content": str(dicMsg.get("content", ""))[:4000]})
        vMessages.append({"role": "user", "content": strMessage})
        vTrace: List[Dict[str, Any]] = []
        vHighlights: List[str] = []
        try:
            for nIter in range(MAX_ITERS):
                if nIter == MAX_ITERS - 1:
                    vMessages.append({"role": "user", "content": FINAL_NUDGE})
                with self._FnPostChat(vMessages, str_model, str_provider)[0] as oRes:
                    dicRes = json.loads(oRes.read().decode("utf-8"))
                strProto = self._FnResolveTarget(str_model, str_provider)[0]
                strContent, vCalls = self._FnParseNonStream(dicRes, strProto)
                vMessages.append({"role": "assistant", "content": strContent})
                if not vCalls:
                    strReply = strContent.strip() or "(empty reply)"
                    return strReply, vTrace, vHighlights, None
                for dicCall in vCalls:
                    strName = str(dicCall.get("name") or "")
                    dicArgs = dicCall.get("args") or {}
                    oResult, strSummary, vIds = self._FnRunTool(strName, dicArgs, strDb, strRepo)
                    dicStep = {"strTool": strName, "dicArgs": dicArgs, "strSummary": strSummary}
                    vTrace.append(dicStep)
                    if fnOnTrace:
                        fnOnTrace(dicStep)
                    for strId in vIds:
                        if strId not in vHighlights:
                            vHighlights.append(strId)
                    try:
                        strResult = json.dumps(oResult, ensure_ascii=False)[:6000]
                    except Exception:
                        strResult = str(oResult)[:6000]
                    vMessages.append({"role": "tool", "content": strResult})
            return "（達到工具呼叫上限，僅顯示已查到的部分結果）", vTrace, vHighlights, None
        except Exception as oErr:
            strErr = f"{type(oErr).__name__}: {oErr}"
            if "URLError" in type(oErr).__name__ or "urlopen error" in strErr:
                return ("連不上本地 LLM（{0}）。請確認 Ollama 有跑，或設 GALAXY_LLM_URL/GALAXY_LLM_MODEL。".format(self._str_base),
                        vTrace, vHighlights, None)
            return f"對話失敗：{strErr}", vTrace, vHighlights, None

    # RDLib ChatDialog provider shape (plus optional model/provider override)
    def FnChat(self, strMessage: str, dicContext: Dict[str, Any],
               str_model: Optional[str] = None, str_provider: Optional[str] = None) -> Dict[str, Any]:
        strReply, vTrace, vHighlights, _ = self._FnLoop(strMessage, dicContext or {}, str_model, str_provider)
        return {"strReply": strReply, "vTrace": vTrace, "vHighlights": vHighlights[:40]}

    def FnChatStream(self, strMessage: str, dicContext: Dict[str, Any],
                     str_model: Optional[str] = None,
                     str_provider: Optional[str] = None) -> Iterator[Tuple[str, Any]]:
        """Trace steps first, then stream the final answer tokens."""
        vSteps: List[Dict[str, Any]] = []
        strReply, vTrace, vHighlights, _ = self._FnLoop(
            strMessage, dicContext or {}, str_model, str_provider, fnOnTrace=vSteps.append)
        for dicStep in vSteps:
            yield ("trace", dicStep)
        # Re-ask for a streamed final answer grounded on the collected evidence.
        strEvidence = json.dumps({"trace": vTrace, "reply_draft": strReply}, ensure_ascii=False)[:8000]
        vMessages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": strMessage},
            {"role": "assistant", "content": "Evidence collected: " + strEvidence},
            {"role": "user", "content": "Now give the final concise answer to the original question."},
        ]
        try:
            oRes, strProto = self._FnPostChat(vMessages, str_model, str_provider, bStream=True)
            with oRes:
                strBuf = ""
                for bLine in oRes:
                    strPiece = self._FnStreamPiece(bLine, strProto)
                    if strPiece is None:
                        break
                    if strPiece:
                        strBuf += strPiece
                        yield ("delta", strPiece)
            strFinal = strBuf.strip() or strReply
        except Exception:
            strFinal = strReply
        yield ("done", {"strReply": strFinal, "vHighlights": vHighlights[:40]})

    @staticmethod
    def _FnStreamPiece(bLine: bytes, str_proto: str) -> Optional[str]:
        """Extract one text piece from a stream line; None means stream end."""
        strLine = bLine.decode("utf-8", "replace").strip()
        if not strLine:
            return ""
        if str_proto == "openai":
            if not strLine.startswith("data:"):
                return ""
            strData = strLine[5:].strip()
            if strData == "[DONE]":
                return None
            try:
                dicChunk = json.loads(strData)
            except Exception:
                return ""
            vChoices = dicChunk.get("choices") or [{}]
            return ((vChoices[0].get("delta") or {}).get("content")) or ""
        try:
            dicChunk = json.loads(strLine)
        except Exception:
            return ""
        if dicChunk.get("done"):
            return None
        return ((dicChunk.get("message") or {}).get("content")) or ""
