/* galaxy-flight.js — keyboard flight (WASD/QE), split from galaxy.js. Classic script, shares global scope; load AFTER galaxy.js. */
// ==========================================
// Keyboard flight (WASD/arrows + QE, Shift boost; CyberControl-style feel)
// ==========================================
const flightKeys = new Set();
let lastFlightRight = { x: 1, y: 0, z: 0 }; // pole fallback, see flightStep

function flightIsTyping() {
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

window.addEventListener('keydown', (e) => {
  if (flightIsTyping()) return;
  const k = (e.key || '').toLowerCase();
  if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
    flightKeys.add(k);
    if (k.startsWith('arrow')) e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => {
  flightKeys.delete((e.key || '').toLowerCase());
});
window.addEventListener('blur', () => flightKeys.clear());

function flightOffset(fwd, right, up, keys, speed) {
  const o = { x: 0, y: 0, z: 0 };
  const add = (v, s) => { o.x += v.x * s; o.y += v.y * s; o.z += v.z * s; };
  if (keys.has('w') || keys.has('arrowup')) add(fwd, speed);
  if (keys.has('s') || keys.has('arrowdown')) add(fwd, -speed);
  if (keys.has('a') || keys.has('arrowleft')) add(right, -speed);
  if (keys.has('d') || keys.has('arrowright')) add(right, speed);
  if (keys.has('e')) add(up, speed);
  if (keys.has('q')) add(up, -speed);
  return o;
}

function startFlightLoop() {
  const tick = () => {
    try { flightStep(); } catch (e) { /* never break the render loop */ }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function flightStep() {
  // Pin camera up every frame (even with no keys): trackball controls roll
  // object.up on drag, and flight math assumes a level horizon — without
  // this D/E skews with accumulated roll. Cheap, idempotent, guarded.
  try {
    const cam = (typeof Graph !== 'undefined' && Graph && typeof Graph.camera === 'function') ? Graph.camera() : null;
    if (cam && cam.up && (cam.up.x !== 0 || cam.up.y !== 1 || cam.up.z !== 0)) cam.up.set(0, 1, 0);
  } catch (e) { /* ignore */ }
  if (!flightKeys.size || typeof Graph === 'undefined' || !Graph || !Graph.cameraPosition) return false;
  const pos = Graph.cameraPosition();
  let tgt = { x: 0, y: 0, z: 0 };
  try {
    const ctrl = (typeof Graph.controls === 'function') ? Graph.controls() : null;
    if (ctrl && ctrl.target && isFinite(ctrl.target.x)) {
      tgt = { x: ctrl.target.x, y: ctrl.target.y, z: ctrl.target.z };
    }
  } catch (e) { /* keep fallback target */ }
  const fwd = { x: tgt.x - pos.x, y: tgt.y - pos.y, z: tgt.z - pos.z };
  const dist = Math.sqrt(fwd.x * fwd.x + fwd.y * fwd.y + fwd.z * fwd.z) || 1;
  fwd.x /= dist; fwd.y /= dist; fwd.z /= dist;
  // Camera-relative basis (no-roll orbit): right is exact screen-right at
  // any yaw/pitch once normalized — the old unnormalized cross product
  // shrank with pitch (0.7x at 45 deg, ~0 looking straight down, so A/D
  // died). Degenerate pole reuses the last good right.
  const worldUp = { x: 0, y: 1, z: 0 };
  let right = {
    x: fwd.y * worldUp.z - fwd.z * worldUp.y,
    y: fwd.z * worldUp.x - fwd.x * worldUp.z,
    z: fwd.x * worldUp.y - fwd.y * worldUp.x,
  };
  const rl = Math.sqrt(right.x * right.x + right.y * right.y + right.z * right.z);
  if (rl > 1e-4) {
    right.x /= rl; right.y /= rl; right.z /= rl;
    lastFlightRight = { x: right.x, y: right.y, z: right.z };
  } else {
    right = { x: lastFlightRight.x, y: lastFlightRight.y, z: lastFlightRight.z };
  }
  // Lift is SCREEN-up (view-relative): worldUp minus its view-direction
  // part, normalized. Level views: identical to world-+Y, nothing changes.
  // Steep pitch: content moves exactly down-screen instead of receding —
  // top-down +Y reads as zoom-out/backward, screen-up stays a pan.
  // Degenerate pole falls back to world-+Y.
  const along = fwd.x * worldUp.x + fwd.y * worldUp.y + fwd.z * worldUp.z;
  let up = { x: worldUp.x - fwd.x * along, y: worldUp.y - fwd.y * along, z: worldUp.z - fwd.z * along };
  const ul = Math.sqrt(up.x * up.x + up.y * up.y + up.z * up.z);
  if (ul > 1e-4) { up.x /= ul; up.y /= ul; up.z /= ul; }
  else { up = { x: worldUp.x, y: worldUp.y, z: worldUp.z }; }
  const speed = dist * 0.02 * (flightKeys.has('shift') ? 3.5 : 1);
  const o = flightOffset(fwd, right, up, flightKeys, speed);
  if (!o.x && !o.y && !o.z) return false;
  const newPos = { x: pos.x + o.x, y: pos.y + o.y, z: pos.z + o.z };
  const newLook = { x: tgt.x + o.x, y: tgt.y + o.y, z: tgt.z + o.z };
  // lookAt follows: pure translation, no tilt (Q/E screen-up, A/D yaw-level, W/S view dolly)
  Graph.cameraPosition(newPos, newLook);
  try {
    const ctrl = (typeof Graph.controls === 'function') ? Graph.controls() : null;
    if (ctrl && ctrl.target) {
      ctrl.target.x = newLook.x; ctrl.target.y = newLook.y; ctrl.target.z = newLook.z;
      if (typeof ctrl.update === 'function') ctrl.update();
    }
  } catch (e) { /* ignore */ }
  return true;
}
