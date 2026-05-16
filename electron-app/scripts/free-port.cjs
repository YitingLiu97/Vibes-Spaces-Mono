#!/usr/bin/env node
// Kills any process listening on the given TCP port. Cross-platform.
// Used as a pre-step before `concurrently` so a stale Vite from a previous
// dev session (concurrently -k doesn't always reap it on Windows) can't
// strand :5173 and break startup via strictPort.

const { execSync } = require('node:child_process');

const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port <= 0) {
  console.error('Usage: free-port.cjs <port>');
  process.exit(1);
}

function findPids() {
  if (process.platform === 'win32') {
    // `netstat -ano` lists both IPv4 and IPv6 TCP rows; `-p tcp` filters IPv6
    // out on some Windows builds, so we list everything and grep for TCP.
    const out = execSync('netstat -ano', { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(/^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/);
      if (m && Number(m[1]) === port) pids.add(Number(m[2]));
    }
    return [...pids];
  }
  try {
    const out = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' });
    return out.trim().split('\n').filter(Boolean).map(Number);
  } catch {
    return [];
  }
}

const pids = findPids();
if (pids.length === 0) process.exit(0);

for (const pid of pids) {
  console.log(`free-port: killing PID ${pid} on :${port}`);
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGKILL');
    }
  } catch (e) {
    console.error(`free-port: failed to kill ${pid}: ${e.message}`);
  }
}
