/**
 * tefrija — remote stream-resolver flow distribution.
 *
 * The app no longer ships the m3u8 resolution flow in its bundle: it downloads
 * it from here, caches it locally, and only re-downloads when resolution fails.
 * When the provider changes again, edit FLOW_SCRIPT below, deploy, and every
 * installed app picks the new flow up on its next failed attempt — no app
 * release needed.
 *
 * Deployed at: https://lively-disk-1187.abcwork.workers.dev/
 *
 * Routes (GET only, no auth unless FLOW_TOKEN is set):
 *   /            -> service info + current flow version (cheap health check)
 *   /v1/flow     -> { version, script, updatedAt, servedAt }  (the app reads this)
 *   /v1/flow/raw -> the raw script as text/plain (handy for curl / diffing)
 *
 * `version` is a content hash computed from FLOW_SCRIPT at startup, so it
 * changes automatically when the script is edited. The app compares it with its
 * cached version to decide whether a retry can possibly help.
 *
 * The flow only *locates* a stream URL; it must run inside the app's WebView
 * because the provider gates every hop on browser state (single-use gate token,
 * per-render API token, WASM stream-URL decryptor) and because the final
 * playlist token is bound to the device's IP, not the worker's.
 */

// ---------------------------------------------------------------------------
// Flow script. Runs as the WebView's injected JavaScript (see resolveFlow.js).
// The app sets window.__VS_ARGS before it runs:
//   { version, srcApi, embedUrl, mediaKey, season, episode, timeout }
// Keep this ES5-ish and free of backticks / ${...} (it lives in a template
// literal below); results go back through ReactNativeWebView.postMessage.
// ---------------------------------------------------------------------------
const FLOW_SCRIPT = `
(function () {
  'use strict';

  var ARGS = window.__VS_ARGS || {};
  if (!ARGS.srcApi) return;

  var FLOW_VERSION = ARGS.version || 'unknown';
  var SOURCE_API = ARGS.srcApi;
  var SEASON = ARGS.season == null ? null : String(ARGS.season);
  var EPISODE = ARGS.episode == null ? null : String(ARGS.episode);
  var RESOLVE_TIMEOUT = ARGS.timeout || 30000;
  var VSDEC_PATH = '/embed/iframe_player/assets/vsdec.js';

  /* One retry of the whole gate -> landing -> player round trip per media item.
   * The provider API regularly stalls for a few seconds, and every hop mints a
   * single-use token, so a retry has to start back at the embed page. The
   * counter lives in window.name because it has to survive those cross-origin
   * navigations; keying it by media keeps a finished title from exhausting the
   * budget of the next one. */
  var RETRY_KEY = 'vs:' + (ARGS.mediaKey || 'x') + ':';

  function retryCount() {
    var name = window.name || '';
    if (name.indexOf(RETRY_KEY) !== 0) return 0;
    return parseInt(name.slice(RETRY_KEY.length), 10) || 0;
  }

  function setRetryCount(n) {
    try {
      window.name = RETRY_KEY + n;
    } catch (e) {}
  }

  function post(msgType, payload) {
    try {
      window.ReactNativeWebView.postMessage(
        JSON.stringify(
          Object.assign({type: msgType, v: FLOW_VERSION}, payload || {}),
        ),
      );
    } catch (e) {}
  }

  /* ---- stage 1: embed page (no gate token yet) ------------------------- */
  /* The landing URL always carries "?vs=", the embed page never does. */
  if (!/[?&]vs=/.test(location.search)) {
    if (window.__vsGateStarted) return;
    window.__vsGateStarted = true;
    var leaving = false;
    setTimeout(function () {
      if (!leaving) {
        post('error', {message: 'vs_src timed out', stage: 'gate'});
      }
    }, 15000);
    /* Same origin, so the gate sees this page as the referring document. */
    fetch(SOURCE_API, {credentials: 'omit', cache: 'no-store'})
      .then(function (r) {
        if (!r.ok) throw new Error('vs_src HTTP ' + r.status);
        return r.json();
      })
      .then(function (j) {
        if (!j || !j.src) throw new Error('no src in vs_src response');
        leaving = true;
        post('progress', {stage: 'landing'});
        location.replace(j.src);
      })
      .catch(function (e) {
        post('error', {message: (e && e.message) || String(e), stage: 'gate'});
      });
    return;
  }

  /* ---- stage 2: landing page on the player host ------------------------ */
  if (window.__vsResolveStarted) return;
  window.__vsResolveStarted = true;

  var stage = 'landing';
  var sent = false;

  /* Nothing may hang forever: an unresolved promise would leave the player on a
   * black screen with no explanation. */
  var watchdog = setTimeout(function () {
    fail('resolution timed out');
  }, RESOLVE_TIMEOUT);

  function found(url) {
    if (sent || !url) return;
    sent = true;
    clearTimeout(watchdog);
    setRetryCount(0);
    post('m3u8', {url: url});
  }

  function fail(message) {
    if (sent) return;
    sent = true;
    clearTimeout(watchdog);
    post('error', {message: message, stage: stage});
  }

  /* Restarts from the embed page, which mints fresh gate/API tokens. Returns
   * true when a navigation was started (the caller must then stop). */
  function retryFromEmbed() {
    if (retryCount() >= 1 || !ARGS.embedUrl) return false;
    setRetryCount(retryCount() + 1);
    progress('retry-landing');
    try {
      location.replace(ARGS.embedUrl);
    } catch (e) {
      return false;
    }
    return true;
  }

  function progress(next) {
    stage = next;
    post('progress', {stage: next});
  }

  function waitFor(check, timeoutMs, label) {
    return new Promise(function (resolve, reject) {
      var started = Date.now();
      (function tick() {
        var value = null;
        try {
          value = check();
        } catch (e) {}
        if (value) return resolve(value);
        if (Date.now() - started > timeoutMs) {
          return reject(new Error('timeout waiting for ' + label));
        }
        setTimeout(tick, 150);
      })();
    });
  }

  function pickUrl(urls) {
    if (!Array.isArray(urls) || !urls.length) return null;
    var master = urls.filter(function (u) {
      return typeof u === 'string' && u.indexOf('master.m3u8') !== -1;
    })[0];
    return master || urls[0];
  }

  function parseToken(text) {
    if (text == null) return '';
    var t = String(text).trim();
    if (t && (t.charAt(0) === '{' || t.charAt(0) === '[')) {
      try {
        var j = JSON.parse(t);
        if (typeof j === 'string') return j;
        if (j && typeof j === 'object') {
          return j.token || j.data || j.string || j.result || '';
        }
      } catch (e) {}
    }
    return t;
  }

  /* The stream CDN rejects a tokenless playlist with 401; <origin>/generate.php
   * mints a short-lived, IP-bound token that has to be appended. */
  function withToken(url) {
    var origin;
    try {
      origin = new URL(url).origin;
    } catch (e) {
      return Promise.resolve(url);
    }
    progress('stream-token');
    return fetch(origin + '/generate.php', {
      credentials: 'omit',
      cache: 'no-store',
    })
      .then(function (r) {
        return r.ok ? r.text() : '';
      })
      .then(function (text) {
        var token = parseToken(text);
        if (token && token.split('.').length === 3) {
          return (
            url +
            (url.indexOf('?') > -1 ? '&' : '?') +
            'token=' +
            encodeURIComponent(token)
          );
        }
        return url;
      })
      .catch(function () {
        return url;
      });
  }

  /* vsdec.js ships with the landing page and transparently decrypts encrypted
   * stream_urls; load it ourselves if the page stopped including it. */
  function fetchJSON(url) {
    if (typeof window.vsFetchJSON === 'function') {
      return window.vsFetchJSON(url);
    }
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = VSDEC_PATH;
      s.onload = function () {
        if (typeof window.vsFetchJSON !== 'function') {
          return reject(new Error('vsdec.js exposes no vsFetchJSON'));
        }
        resolve(window.vsFetchJSON(url));
      };
      s.onerror = function () {
        reject(new Error('vsdec.js failed to load'));
      };
      (document.head || document.documentElement).appendChild(s);
    });
  }

  /* window.CONFIG is a JSON literal in the player page; walk it out by brace
   * matching so nested objects survive (a regex would stop at the first }). */
  function extractConfig(html, marker) {
    var at = html.indexOf(marker);
    if (at < 0) return null;
    var start = html.indexOf('{', at);
    if (start < 0) return null;
    var depth = 0;
    var inString = false;
    var quote = '';
    for (var i = start; i < html.length; i++) {
      var c = html.charAt(i);
      if (inString) {
        if (c.charCodeAt(0) === 92) {
          i++;
        } else if (c === quote) {
          inString = false;
        }
        continue;
      }
      if (c === '"' || c === "'") {
        inString = true;
        quote = c;
      } else if (c === '{') {
        depth++;
      } else if (c === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(html.slice(start, i + 1));
          } catch (e) {
            return null;
          }
        }
      }
    }
    return null;
  }

  /* Requesting the nested player page mints the single-use api_token, which is
   * only ever exposed inside that page's own window.CONFIG. */
  function playerConfig() {
    return waitFor(
      function () {
        return window.CFG && window.CFG.playerUrl;
      },
      15000,
      'CFG.playerUrl',
    )
      .then(function (playerUrl) {
        progress('player-page');
        return fetch(playerUrl, {credentials: 'omit', cache: 'no-store'});
      })
      .then(function (r) {
        if (!r.ok) throw new Error('player page HTTP ' + r.status);
        return r.text();
      })
      .then(function (html) {
        var cfg = extractConfig(html, 'window.CONFIG');
        if (!cfg) throw new Error('no window.CONFIG in player page');
        return cfg;
      });
  }

  function streamApi(cfg) {
    var s = cfg.season != null ? cfg.season : SEASON;
    var e = cfg.episode != null ? cfg.episode : EPISODE;
    var api = cfg.api;
    if (!api && cfg.streamBase && s != null && e != null) {
      api =
        cfg.streamBase +
        '&season=' +
        encodeURIComponent(s) +
        '&episode=' +
        encodeURIComponent(e);
    }
    if (!api) throw new Error('no stream api in CONFIG');
    if (api.indexOf('stream_urls') === -1) {
      api += (api.indexOf('?') > -1 ? '&' : '?') + 'stream_urls';
    }
    if (cfg.apiToken) {
      api +=
        (api.indexOf('?') > -1 ? '&' : '?') +
        'api_token=' +
        encodeURIComponent(cfg.apiToken);
    }
    return api;
  }

  post('diag', {
    wasm: typeof window.WebAssembly,
    textDecoder: typeof window.TextDecoder,
    atob: typeof window.atob,
    fetch: typeof window.fetch,
  });

  playerConfig()
    .then(function (cfg) {
      progress('stream-api');
      return fetchJSON(streamApi(cfg));
    })
    .then(function (j) {
      var urls = j && j.data && j.data.stream_urls;
      if (!Array.isArray(urls)) {
        throw new Error(
          'stream_urls ' +
            (urls == null ? 'missing' : 'not decrypted (' + typeof urls + ')'),
        );
      }
      var url = pickUrl(urls);
      if (!url) throw new Error('no playable url in stream_urls');
      return withToken(url);
    })
    .then(found)
    .catch(function (e) {
      var message = (e && e.message) || String(e);
      /* A stalled API usually clears up on a second pass; retrying silently is
       * better than failing the title. */
      if (!retryFromEmbed()) {
        fail(message);
      }
    });
})();
`;

// ---------------------------------------------------------------------------
// Versioning / serving
// ---------------------------------------------------------------------------

// FNV-1a over the script: changes whenever the script changes, so the app can
// tell "nothing new upstream" from "a new flow is available" without a manual
// version bump.
function contentVersion(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${(hash >>> 0).toString(16).padStart(8, '0')}-${text.length.toString(
    16,
  )}`;
}

const FLOW_VERSION = contentVersion(FLOW_SCRIPT);
const FLOW_UPDATED_AT = new Date().toISOString();

const BASE_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, OPTIONS',
  'access-control-allow-headers': 'content-type, if-none-match, x-flow-token',
  // The app caches locally and asks again only after a failure, so the worker
  // must never answer with a stale copy.
  'cache-control': 'no-store, must-revalidate',
};

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...BASE_HEADERS,
      'content-type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const route = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') {
      return new Response(null, {status: 204, headers: BASE_HEADERS});
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return json({error: 'method not allowed'}, 405);
    }

    // Optional shared secret: set FLOW_TOKEN on the worker to require an
    // "x-flow-token: <value>" header from the app (see resolveFlow.js).
    if (env && env.FLOW_TOKEN) {
      if (request.headers.get('x-flow-token') !== env.FLOW_TOKEN) {
        return json({error: 'forbidden'}, 403);
      }
    }

    const etag = `"${FLOW_VERSION}"`;
    const unchanged = request.headers.get('if-none-match') === etag;

    if (route === '/') {
      return json({
        service: 'tefrija-stream-resolver',
        version: FLOW_VERSION,
        updatedAt: FLOW_UPDATED_AT,
        endpoints: {flow: '/v1/flow', raw: '/v1/flow/raw'},
      });
    }

    if (route === '/v1/flow' || route === '/v1/flow/raw') {
      if (unchanged) {
        return new Response(null, {
          status: 304,
          headers: {...BASE_HEADERS, etag},
        });
      }
      if (route === '/v1/flow/raw') {
        return new Response(FLOW_SCRIPT, {
          status: 200,
          headers: {
            ...BASE_HEADERS,
            'content-type': 'text/plain; charset=utf-8',
            etag,
          },
        });
      }
      return json(
        {
          version: FLOW_VERSION,
          updatedAt: FLOW_UPDATED_AT,
          servedAt: new Date().toISOString(),
          script: FLOW_SCRIPT,
        },
        200,
        {etag},
      );
    }

    return json(
      {
        error: 'not found',
        routes: ['/', '/v1/flow', '/v1/flow/raw'],
      },
      404,
    );
  },
};
