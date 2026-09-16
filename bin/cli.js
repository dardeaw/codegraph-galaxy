#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

console.log('🌌 Starting Code Graph Galaxy...');

// Path to app.py
const appPy = path.join(__dirname, '..', 'app.py');
const electronBin = path.join(__dirname, '..', 'node_modules', '.bin', os.platform() === 'win32' ? 'electron.cmd' : 'electron');

const electronProcess = spawn(electronBin, [path.join(__dirname, '..')], {
  stdio: 'inherit',
  env: process.env
});

electronProcess.on('close', (code) => {
  process.exit(code);
});
