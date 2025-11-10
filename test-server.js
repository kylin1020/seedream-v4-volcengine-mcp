#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🧪 Testing SeedDream 4.0 Volcengine MCP Server...\n');

const server = spawn('node', ['build/index.js']);

// Send a tools/list request after a short delay
setTimeout(() => {
  const request = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  }) + '\n';

  console.log('📤 Sending request:', request.trim());
  server.stdin.write(request);

  // Wait for response, then exit
  setTimeout(() => {
    server.kill();
  }, 2000);
}, 1000);

server.stdout.on('data', (data) => {
  console.log('📥 Response:', data.toString());
});

server.stderr.on('data', (data) => {
  console.log('ℹ️  Server log:', data.toString().trim());
});

server.on('close', (code) => {
  console.log(`\n✅ Server test completed with exit code ${code}`);
  process.exit(code || 0);
});

server.on('error', (err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});

