import * as React from 'react';
import WebView from 'react-native-webview';

import {useRef, useState} from 'react';

import {View} from 'react-native';

/**
 * Resolves the .m3u8 stream URL for a movie/tv item.
 *
 * The provider nests the real player two iframes deep, and those embed/player
 * pages are only served when requested as *real embedded subframes* (the check
 * is server-side and a direct/main-frame navigation always 404s/"expired").
 * Injecting JS into those nested frames is also unreliable: on Android,
 * react-native-webview only runs injected scripts in the main frame.
 *
 * Instead we load the top-level embed page (which loads fine and where
 * injected JS *does* run) and resolve the stream the same way the player does:
 *   1. fetch the CORS-open stream API (`.../api.php?type=...&<imdb|tmdb>=...&stream_urls`)
 *      which returns `data.stream_urls` as either an array or an encrypted
 *      base64 string plus a top-level `vs: { w, wasm_url }` descriptor
 *   2. decrypt that string inline via the per-window WASM ChaCha20 decryptor
 *      (falling back to the provider's `vsdec.js` / XHR sniffing)
 *   3. post the resolved master.m3u8 URL back to RN via `onDone`
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
      ? `https://vsembed.ru/embed/movie/${id}`
      : `https://vsembed.ru/embed/tv/${id}/${season}/${episode}`;

  // The provider API takes `imdb=<tt...>` for IMDb ids and `tmdb=<n>` for
  // numeric TMDB ids. The app passes a TMDB numeric id, but support both.
  const idParam = /^tt\d+$/i.test(String(id)) ? `imdb=${id}` : `tmdb=${id}`;
  const metaApi =
    type === 'movie'
      ? `https://data.vidsrcme.ru/api.php?type=movie&${idParam}`
      : `https://data.vidsrcme.ru/api.php?type=tv&${idParam}&season=${season}&episode=${episode}`;

  /**
   * The m3u8 CDN requires a short-lived token (`?token=<jwt>`) that the player
   * obtains from `<stream-origin>/generate.php`; a bare URL returns HTTP 401.
   * The player page is CORS-blocked from calling generate.php, but React
   * Native's native fetch has no CORS restriction, so we fetch the token here
   * and append it. The master playlist's child URLs already carry the token.
   */
  const withStreamToken = async m3u8Url => {
    try {
      const origin = new URL(m3u8Url).origin;
      const resp = await fetch(`${origin}/generate.php`);
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
    if (window.__vsResolverStarted) return;
    window.__vsResolverStarted = true;

    var META_API = ${JSON.stringify(metaApi)};
    var STREAM_API = META_API + '&stream_urls';
    var VSDEC_URL = 'https://cloudorchestranova.com/embed/iframe_player/assets/vsdec.js';
    var sent = false;
    var stage = 'init';

    function post(msgType, payload) {
      try {
        window.ReactNativeWebView.postMessage(
          JSON.stringify(Object.assign({type: msgType}, payload || {})),
        );
      } catch (e) {}
    }

    function found(url) {
      if (sent || !url) return;
      sent = true;
      post('m3u8', {url: url});
    }

    function fail(message) {
      if (sent) return;
      sent = true;
      post('error', {message: message, stage: stage});
    }

    function pickUrl(urls) {
      if (!Array.isArray(urls) || !urls.length) return null;
      var master = urls.filter(function (u) {
        return typeof u === 'string' && u.indexOf('master.m3u8') !== -1;
      })[0];
      return master || urls[0];
    }

    // Capability diagnostic (helps diagnose platform-specific issues).
    post('diag', {
      wasm: typeof window.WebAssembly,
      textDecoder: typeof window.TextDecoder,
      atob: typeof window.atob,
      fetch: typeof window.fetch,
    });

    function b64(s) {
      var bin = atob(s);
      var u = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return u;
    }

    // Safety net: also sniff XHR requests for an .m3u8.
    try {
      var _open = window.XMLHttpRequest.prototype.open;
      window.XMLHttpRequest.prototype.open = function (method, u) {
        try {
          if (typeof u === 'string' && u.indexOf('.m3u8') !== -1) {
            found(u);
          }
        } catch (e) {}
        return _open.apply(this, arguments);
      };
    } catch (e) {}

    // Decrypt the base64 ChaCha20 stream_urls using the WASM decryptor.
    function decryptInline(json) {
      stage = 'decrypt';
      var vs = json && json.vs;
      if (!vs || !window.WebAssembly) {
        return Promise.reject(new Error('no vs/WebAssembly'));
      }
      var bytesP;
      if (vs.wasm) {
        bytesP = Promise.resolve(b64(vs.wasm));
      } else if (vs.wasm_url) {
        bytesP = fetch(vs.wasm_url, {credentials: 'omit'})
          .then(function (r) {
            stage = 'wasm-http:' + r.status + ':' + (r.headers.get('content-type') || '');
            return r.arrayBuffer();
          })
          .then(function (b) { return new Uint8Array(b); });
      } else {
        return Promise.reject(new Error('no wasm source'));
      }
      return bytesP
        .then(function (bytes) {
          stage = 'wasm-bytes:' + bytes.length + ':0x' +
            bytes[0].toString(16) + bytes[1].toString(16) + bytes[2].toString(16) + bytes[3].toString(16);
          return WebAssembly.compile(bytes);
        })
        .then(function (mod) { return WebAssembly.instantiate(mod, {}); })
        .then(function (inst) {
          var ex = inst.exports;
          var enc = b64(json.data.stream_urls);
          var ptr = ex.alloc(enc.length);
          new Uint8Array(ex.memory.buffer, ptr, enc.length).set(enc);
          var outLen = ex.decrypt(ptr, enc.length);
          var txt = new TextDecoder().decode(
            new Uint8Array(ex.memory.buffer, ptr + 12, outLen),
          );
          return txt.split('\\n').filter(function (s) { return s; });
        });
    }

    // Fallback: use the provider's own vsdec.js -> window.vsFetchJSON.
    function viaVsdec() {
      stage = 'vsdec';
      return new Promise(function (resolve, reject) {
        if (typeof window.vsFetchJSON === 'function') return resolve();
        var s = document.createElement('script');
        s.src = VSDEC_URL;
        s.onload = function () { resolve(); };
        s.onerror = function () { reject(new Error('vsdec.js failed to load')); };
        (document.head || document.documentElement).appendChild(s);
      })
        .then(function () { return window.vsFetchJSON(STREAM_API); })
        .then(function (j) {
          var u = j && j.data && j.data.stream_urls;
          return Array.isArray(u) ? u : null;
        });
    }

    stage = 'fetch';
    fetch(STREAM_API, {credentials: 'omit', headers: {accept: 'application/json'}})
      .then(function (r) { return r.json(); })
      .then(function (json) {
        var su = json && json.data && json.data.stream_urls;
        if (Array.isArray(su)) {
          return su;
        }
        if (typeof su !== 'string') {
          throw new Error('no stream_urls in API response');
        }
        // Encrypted: try inline decrypt first, then fall back to vsdec.js.
        return decryptInline(json)
          .then(function (urls) {
            if (urls && urls.length) {
              return urls;
            }
            return viaVsdec();
          })
          .catch(function (inlineErr) {
            return viaVsdec().catch(function (vsErr) {
              throw new Error(
                'inline[' + (inlineErr && inlineErr.message) + '] vsdec[' +
                (vsErr && vsErr.message) + ']',
              );
            });
          });
      })
      .then(function (urls) {
        var url = pickUrl(urls);
        if (url) {
          found(url);
        } else {
          fail('no playable url after decrypt');
        }
      })
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
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
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
