import * as React from 'react';
import WebView from 'react-native-webview';

import {useRef, useState} from 'react';

import {View} from 'react-native';

const EMBED_ORIGIN = 'https://vsembed.ru';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36';

/**
 * Resolves the .m3u8 stream URL for a movie/tv item.
 *
 * The whole provider flow is gated server-side, so it has to run inside a real
 * browser context (token minting and the WASM stream_urls decryptor both need
 * it):
 *
 *   1. the embed page exposes `<iframe data-api="/vs_src.php?...">`; that
 *      endpoint mints a single-use, host-bound gate token and answers with
 *      `{ src: <player host landing page>?vs=<token> }`
 *   2. the landing page renders `window.CFG` with a relative `playerUrl`;
 *      requesting that nested player page mints a **single-use** `api_token`
 *      that is only exposed in its own `window.CONFIG`
 *   3. `data.vidsrc.sh/api.php?...&stream_urls&api_token=<token>` returns
 *      `data.stream_urls`, either an array or an encrypted base64 ChaCha20
 *      string plus a `vs: { w, wasm_url }` descriptor
 *   4. every stream URL comes back tokenless; `<stream-origin>/generate.php`
 *      hands out a short-lived IP-bound token that has to be appended
 *
 * Those two provider pages live on different origins, and the player page only
 * answers as a subframe/subresource (a main-frame navigation 403s), while on
 * Android injected scripts only run in the WebView's main frame. So rather than
 * reaching into the provider's nested player iframe, we move the WebView to the
 * *landing* page (same origin as the player host, which makes the player page
 * HTML readable with a same-origin fetch) and resolve the stream there using
 * the provider's own `vsFetchJSON` decryptor (`vsdec.js` is already loaded on
 * that page).
 *
 * The hop between the two pages happens in-page (`location.replace`) so the gate
 * sees the same origin-only `Referer` the provider's own iframe sends.
 */
export const FetchVideoComponent = ({
  id,
  type,
  season,
  episode,
  onDone,
  onError,
}) => {
  const webview = useRef(null);

  const [done, setDone] = useState(false);

  const embedUrl =
    type === 'movie'
      ? `${EMBED_ORIGIN}/embed/movie/${id}`
      : `${EMBED_ORIGIN}/embed/tv/${id}/${season}/${episode}`;

  // `/vs_src.php` takes the raw TMDB *or* IMDb id in a single `id` param.
  const srcApi =
    type === 'movie'
      ? `${EMBED_ORIGIN}/vs_src.php?type=movie&id=${encodeURIComponent(id)}`
      : `${EMBED_ORIGIN}/vs_src.php?type=tv&id=${encodeURIComponent(
          id,
        )}&season=${season}&episode=${episode}`;

  /**
   * Fallback for the stream token: the injected script normally appends it from
   * inside the page, where the request looks exactly like the player's own.
   */
  const withStreamToken = async m3u8Url => {
    if (/[?&]token=/.test(m3u8Url)) {
      return m3u8Url;
    }
    try {
      const origin = new URL(m3u8Url).origin;
      const resp = await fetch(`${origin}/generate.php`, {
        headers: {'user-agent': USER_AGENT},
      });
      const token = (await resp.text()).trim();
      if (token && token.split('.').length === 3) {
        const sep = m3u8Url.includes('?') ? '&' : '?';
        return `${m3u8Url}${sep}token=${encodeURIComponent(token)}`;
      }
    } catch (e) {
      console.log('stream token fetch failed', e);
    }
    return m3u8Url;
  };

  const injectScript = `
  (function () {
    function post(msgType, payload) {
      try {
        window.ReactNativeWebView.postMessage(
          JSON.stringify(Object.assign({type: msgType}, payload || {})),
        );
      } catch (e) {}
    }

    var SOURCE_API = ${JSON.stringify(srcApi)};
    var SEASON = ${JSON.stringify(season == null ? null : String(season))};
    var EPISODE = ${JSON.stringify(episode == null ? null : String(episode))};
    var VSDEC_PATH = '/embed/iframe_player/assets/vsdec.js';

    // ---- Stage 1: embed page -> gate token -> landing page ------------------
    // The landing URL always carries the gate token ("?vs="), the embed page
    // never does, so this stays correct if the embed origin moves.
    if (!/[?&]vs=/.test(location.search)) {
      if (window.__vsGateStarted) return;
      window.__vsGateStarted = true;
      var leaving = false;
      setTimeout(function () {
        if (!leaving) {
          post('error', {message: 'vs_src timed out', stage: 'gate'});
        }
      }, 15000);
      // Same origin, so the gate sees this page as the referring document.
      fetch(SOURCE_API, {credentials: 'omit', cache: 'no-store'})
        .then(function (r) {
          if (!r.ok) throw new Error('vs_src HTTP ' + r.status);
          return r.json();
        })
        .then(function (j) {
          if (!j || !j.src) throw new Error('no src in vs_src response');
          leaving = true;
          location.replace(j.src);
        })
        .catch(function (e) {
          post('error', {message: (e && e.message) || String(e), stage: 'gate'});
        });
      return;
    }

    // ---- Stage 2: landing page on the player host ---------------------------
    if (window.__vsResolveStarted) return;
    window.__vsResolveStarted = true;

    var stage = 'init';
    var sent = false;

    // Nothing here is allowed to hang forever: the provider API can stall
    // behind its CDN, and an unresolved promise would leave a blank player.
    var watchdog = setTimeout(function () {
      fail('resolution timed out');
    }, 30000);

    function found(url) {
      if (sent || !url) return;
      sent = true;
      clearTimeout(watchdog);
      post('m3u8', {url: url});
    }

    function fail(message) {
      if (sent) return;
      sent = true;
      clearTimeout(watchdog);
      post('error', {message: message, stage: stage});
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

    // The stream CDN rejects a bare playlist with 401: every request needs the
    // short-lived token served by <stream-origin>/generate.php.
    function withToken(url) {
      var origin;
      try {
        origin = new URL(url).origin;
      } catch (e) {
        return Promise.resolve(url);
      }
      stage = 'stream-token';
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

    // vsdec.js is part of the landing page; load it ourselves if the page layout
    // changed. It transparently decrypts encrypted stream_urls.
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

    // window.CONFIG is a JSON literal inside the player page; walk it out by
    // brace matching so nested objects survive (a plain regex would not).
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

    // Fetching the nested player page mints the single-use api_token, which is
    // only exposed inside that page's own window.CONFIG.
    function playerConfig() {
      return waitFor(
        function () {
          return window.CFG && window.CFG.playerUrl;
        },
        15000,
        'CFG.playerUrl',
      )
        .then(function (playerUrl) {
          stage = 'player-page';
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
        stage = 'stream-api';
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
        fail((e && e.message) || String(e));
      });
  })();
`;

  return (
    <View>
      <WebView
        ref={webview}
        style={{width: 1, height: 1, position: 'absolute'}}
        originWhitelist={['*']}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        source={{
          uri: embedUrl,
          headers: {
            referer: `${embedUrl}/`,
            'user-agent': USER_AGENT,
          },
        }}
        injectedJavaScriptBeforeContentLoaded={injectScript}
        injectedJavaScript={injectScript}
        onMessage={async event => {
          if (done) {
            return;
          }
          let data;
          try {
            data = JSON.parse(event.nativeEvent.data);
          } catch (e) {
            return;
          }

          switch (data.type) {
            case 'm3u8': {
              setDone(true);
              const url = await withStreamToken(data.url);
              console.log('m3u8 found', url);
              onDone(url);
              break;
            }

            case 'error':
              console.log('resolve error', data.message, 'stage=', data.stage);
              if (onError) {
                onError(data.message);
              }
              break;

            case 'diag':
              console.log('resolve diag', JSON.stringify(data));
              break;

            default:
              break;
          }
        }}
        onError={syntheticEvent => {
          const {nativeEvent} = syntheticEvent;
          if (onError) {
            onError(nativeEvent.description || 'webview error');
          }
        }}
      />
    </View>
  );
};
