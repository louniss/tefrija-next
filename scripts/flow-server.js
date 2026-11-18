#!/usr/bin/env node
/**
 * Serves the resolver flow from worker.js over http://10.0.2.2:<port> so the app
 * can pick up flow edits without deploying the worker. The app's endpoint is
 * pointed here while iterating (see RESOLVE_FLOW_ENDPOINT in resolveFlow.js).
 *
 *   node scripts/flow-server.js [port]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = parseInt(process.argv[2], 10) || 8099;
const workerPath = path.join(__dirname, '..', 'worker.js');

const readFlow = () => {
  const source = fs.readFileSync(workerPath, 'utf8');
  const match = source.match(/const FLOW_SCRIPT = `([\s\S]*?)`;\n/);
  if (!match) {
    throw new Error('FLOW_SCRIPT not found in worker.js');
  }
  return match[1];
};

const contentHash = text => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const script = readFlow();
  const version = `local-${contentHash(script)}`;

  if (url === '/v1/flow') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(
      JSON.stringify({
        version,
        script,
        updatedAt: new Date().toISOString(),
        servedAt: new Date().toISOString(),
      }),
    );
    return;
  }
  if (url === '/v1/flow/raw') {
    res.writeHead(200, {'Content-Type': 'text/plain', 'Cache-Control': 'no-store'});
    res.end(script);
    return;
  }
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({ok: true, version, endpoints: ['/v1/flow', '/v1/flow/raw']}));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`flow server on http://0.0.0.0:${port} (device: http://10.0.2.2:${port})`);
});
