import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {View} from 'react-native';
import WebView from 'react-native-webview';

import {originOf} from './playlists';

/**
 * Fetches on behalf of the app from inside a WebView.
 *
 * The stream CDN sits behind Cloudflare, which answers the app's own HTTP stack
 * (okhttp, and therefore `fetch` and ExoPlayer) with a "you have been blocked"
 * page. A WebView is the browser the provider expects, so playlists and chunks
 * are downloaded there and handed back to JS.
 *
 * A single hidden WebView is shared by every caller: requests are piped through
 * it one page at a time, keyed by an incrementing id.
 */

const LOAD_TIMEOUT_MS = 20000;
const REQUEST_TIMEOUT_MS = 45000;

/** Installed in every document before the page's own scripts run. */
const BOOTSTRAP = `
(function () {
  if (window.__tefFetch) return;
  function post(payload) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch (e) {}
  }
  window.__tefFetch = function (id, url, binary, credentials) {
    fetch(url, {
      credentials: credentials || 'omit',
      cache: 'no-store',
      redirect: 'follow',
    })
      .then(function (r) {
        if (!binary) {
          return r.text().then(function (t) {
            post({id: id, status: r.status, text: t});
          });
        }
        return r.arrayBuffer().then(function (ab) {
          var bytes = new Uint8Array(ab);
          var step = 8192;
          var s = '';
          for (var i = 0; i < bytes.length; i += step) {
            s += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
          }
          post({id: id, status: r.status, b64: btoa(s)});
        });
      })
      .catch(function (e) {
        post({id: id, error: String((e && e.message) || e)});
      });
  };
})();
true;
`;

let hostRef = null;
let loadedDocument = null;
let readyPromise = null;
let readyResolve = null;
let readyReject = null;
let nextId = 0;
const pending = new Map();

const settleReady = (error) => {
  const resolve = readyResolve;
  const reject = readyReject;
  readyPromise = null;
  readyResolve = null;
  readyReject = null;
  if (!resolve) {
    return;
  }
  if (error) {
    reject(error);
  } else {
    resolve();
  }
};

export function attachWebFetchHost(host) {
  hostRef = host;
  return () => {
    if (hostRef === host) {
      hostRef = null;
      loadedDocument = null;
      settleReady(new Error('web fetch host detached'));
    }
  };
}

/**
 * Points the shared WebView at `documentUrl` and resolves once that document is
 * usable, so the requests that follow carry the same Origin/Referer — and the
 * same cookies — as the provider's own player.
 */
export function prepareWebFetch(documentUrl) {
  if (!hostRef) {
    return Promise.reject(new Error('web fetch host not mounted'));
  }
  if (loadedDocument === documentUrl) {
    return readyPromise || Promise.resolve();
  }
  loadedDocument = documentUrl;
  readyPromise = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  const pendingReady = readyPromise;
  hostRef.load(documentUrl);
  const timer = setTimeout(() => {
    if (readyPromise === pendingReady) {
      settleReady(new Error(`web fetch host did not load ${documentUrl}`));
    }
  }, LOAD_TIMEOUT_MS);
  return pendingReady.finally(() => clearTimeout(timer));
}

/**
 * Fetches `url` from inside the WebView, loading its origin first when needed.
 * Text responses come back as strings, chunks as base64.
 */
export async function webFetch(
  url,
  {binary = false, document, credentials = 'omit'} = {},
) {
  let documentUrl = document;
  if (!documentUrl) {
    try {
      documentUrl = `${originOf(url)}/`;
    } catch (e) {
      throw new Error(`bad url ${url}`);
    }
  }
  await prepareWebFetch(documentUrl);

  const id = `${Date.now()}-${++nextId}`;
  const result = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`web fetch timed out: ${url}`));
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, {resolve, reject, timer});
  });

  hostRef.inject(
    `window.__tefFetch(${JSON.stringify(id)}, ${JSON.stringify(url)}, ${
      binary ? 'true' : 'false'
    }, ${JSON.stringify(credentials)}); true;`,
  );

  return result;
}

export const WebFetchHost = () => {
  const ref = useRef(null);
  const [uri, setUri] = useState(null);
  const [loadToken, setLoadToken] = useState(0);

  useEffect(() => {
    const detach = attachWebFetchHost({
      load: (documentUrl) => {
        console.log('web fetch host load', String(documentUrl).slice(0, 90));
        setUri(documentUrl);
        setLoadToken(n => n + 1);
      },
      inject: (script) => {
        if (ref.current) {
          ref.current.injectJavaScript(script);
        }
      },
    });
    return detach;
  }, []);

  const handleMessage = useCallback((event) => {
    let payload;
    try {
      payload = JSON.parse(event.nativeEvent.data);
    } catch (e) {
      return;
    }
    const entry = pending.get(payload.id);
    if (!entry) {
      return;
    }
    pending.delete(payload.id);
    clearTimeout(entry.timer);
    if (payload.error) {
      entry.reject(new Error(payload.error));
      return;
    }
    entry.resolve({
      status: payload.status,
      text: payload.text,
      b64: payload.b64,
    });
  }, []);

  if (!uri) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -2000,
        left: -2000,
        width: 2,
        height: 2,
        opacity: 0,
      }}>
      <WebView
        key={`${uri}-${loadToken}`}
        ref={ref}
        style={{width: 2, height: 2}}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        injectedJavaScriptBeforeContentLoaded={BOOTSTRAP}
        source={{uri}}
        onMessage={handleMessage}
        onHttpError={event => {
          const {statusCode, url} = event.nativeEvent;
          console.log('web fetch host http', statusCode, String(url).slice(0, 90));
        }}
        onLoadEnd={event => {
          console.log(
            'web fetch host loaded',
            String(event.nativeEvent && event.nativeEvent.url).slice(0, 90),
          );
          settleReady(null);
        }}
        onError={(event) => {
          const description =
            (event.nativeEvent && event.nativeEvent.description) ||
            'web fetch host error';
          settleReady(new Error(description));
        }}
      />
    </View>
  );
};
