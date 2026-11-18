#!/usr/bin/env node
/**
 * Talks to the running app through Metro's CDP proxy.
 *
 * Hermes does not await promises for `Runtime.evaluate`, so an expression that
 * returns a promise resolves to an empty value. Everything async is therefore
 * written to a global and polled.
 *
 * Usage:
 *   node scripts/rn-probe.js --logs          # tail console + exceptions
 *   node scripts/rn-probe.js --logs 60000    # tail for a minute
 *   node scripts/rn-probe.js --eval "1 + 2"
 *   node scripts/rn-probe.js --eval-async "fetch('https://x').then(r => r.status)" 30000
 */
const WebSocket = require('ws');

const METRO = process.env.METRO_URL || 'http://127.0.0.1:8081';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {mode: 'logs', value: null, timeout: 20000};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--logs') out.mode = 'logs';
    else if (args[i] === '--eval') {
      out.mode = 'eval';
      out.value = args[++i];
    } else if (args[i] === '--eval-async') {
      out.mode = 'eval-async';
      out.value = args[++i];
    } else if (/^\d+$/.test(args[i])) out.timeout = parseInt(args[i], 10);
  }
  return out;
}

const fmt = v => {
  if (v === undefined || v === null) return String(v);
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch (e) {
    return String(v);
  }
};

async function connect() {
  const targets = await fetch(`${METRO}/json/list`).then(r => r.json());
  const target = targets.find(t => !!t.webSocketDebuggerUrl);
  if (!target) throw new Error('no CDP target');
  const ws = new WebSocket(target.webSocketDebuggerUrl, {
    origin: METRO,
  });
  let id = 0;
  const pending = new Map();
  const listeners = new Set();

  ws.on('message', raw => {
    let message;
    try {
      message = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
      return;
    }
    for (const listener of listeners) listener(message);
  });

  const send = (method, params = {}) =>
    new Promise(resolve => {
      const requestId = ++id;
      pending.set(requestId, resolve);
      ws.send(JSON.stringify({id: requestId, method, params}));
    });

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  await send('Runtime.enable');
  await send('Console.enable');
  return {ws, send, listeners};
}

const describe = arg => {
  if (!arg) return 'undefined';
  if (arg.value !== undefined) return fmt(arg.value);
  if (arg.unserializableValue) return arg.unserializableValue;
  return arg.description || arg.type;
};

async function main() {
  const opts = parseArgs();
  const {ws, send, listeners} = await connect();

  if (opts.mode === 'logs') {
    listeners.add(message => {
      if (message.method === 'Runtime.consoleAPICalled') {
        const {type, args} = message.params;
        console.log(`[${type}]`, args.map(describe).join(' '));
      } else if (message.method === 'Runtime.exceptionThrown') {
        const d = message.params.exceptionDetails;
        console.log(
          '[exception]',
          (d.exception && (d.exception.description || d.exception.value)) ||
            d.text,
        );
      }
    });
    setTimeout(() => {
      ws.close();
      process.exit(0);
    }, opts.timeout);
    return;
  }

  if (opts.mode === 'eval') {
    const result = await send('Runtime.evaluate', {
      expression: opts.value,
      returnByValue: true,
      awaitPromise: false,
    });
    if (result.result && result.result.exceptionDetails) {
      console.log('exception', fmt(result.result.exceptionDetails));
    } else {
      console.log(fmt(result.result && result.result.result && result.result.result.value));
    }
    ws.close();
    return;
  }

  // eval-async: stash the outcome on a global and poll for it.
  const stamp = Date.now();
  const key = `__probe_${stamp}`;
  const wrapped = `
    (function () {
      var box = {done: false};
      window.${key} = box;
      Promise.resolve().then(function () { return (${opts.value}); })
        .then(function (v) { box.done = true; box.value = v; })
        .catch(function (e) { box.done = true; box.error = (e && (e.stack || e.message)) || String(e); });
    })();
    'started'`;
  await send('Runtime.evaluate', {
    expression: wrapped,
    returnByValue: true,
  });

  const deadline = Date.now() + opts.timeout;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 500));
    const res = await send('Runtime.evaluate', {
      expression: `JSON.stringify(window.${key} || null)`,
      returnByValue: true,
    });
    const raw = res.result && res.result.result && res.result.result.value;
    if (!raw) continue;
    let box;
    try {
      box = JSON.parse(raw);
    } catch (e) {
      continue;
    }
    if (box && box.done) {
      if (box.error) console.log('error', box.error);
      else console.log(fmt(box.value));
      ws.close();
      return;
    }
  }
  console.log('timed out');
  ws.close();
  process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
