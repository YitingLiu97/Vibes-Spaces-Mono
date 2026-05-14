#!/usr/bin/env node
// Launches Electron with ELECTRON_RUN_AS_NODE unset.
// Workaround: when this env var is set in the parent shell, Electron's
// binary runs as plain Node.js — `require('electron')` returns the
// binary path string instead of the API, and `protocol`/`app`/etc are
// undefined. Wiping it here guarantees a real Electron process.
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.VITE_DEV_SERVER_URL = env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';

const { spawn } = require('node:child_process');
const electronPath = require('electron');
const child = spawn(electronPath, ['.'], { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
  console.error('Failed to launch Electron:', err);
  process.exit(1);
});
