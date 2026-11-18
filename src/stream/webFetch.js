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

const LOAD_TIMEOUT_MS = 12000;
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
/**
 * Which document worked for a given origin. A context that answered once keeps
 * answering (until its page/token dies), so probing is only paid once.
 */
const bestDocument = new Map();
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
  if (error) {
    // A document that could not be loaded must not be reused as a fetch context.
    loadedDocument = null;
  }
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

const request = async (url, {binary, credentials}) => {
  const id = `${Date.now()}-${++nextId}`;
  const result = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`web fetch timed out: ${url}`));
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, {resolve, reject, timer});
  });

  hostRef.inject(
    `(function () {
      var id = ${JSON.stringify(id)};
      if (typeof window.__tefFetch !== 'function') {
        // The page navigated itself somewhere else (provider ads do this), so
        // the bootstrap is gone. Report it at once instead of waiting for the
        // request timeout.
        try {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({id: id, error: 'fetcher missing'}),
          );
        } catch (e) {}
        return;
      }
      window.__tefFetch(id, ${JSON.stringify(url)}, ${
        binary ? 'true' : 'false'
      }, ${JSON.stringify(credentials)});
    })(); true;`,
  );

  return result;
};

/** Issues the request from `documentUrl`; throws on a bad status. */
const sendFrom = async (url, documentUrl, {binary, credentials}) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    await prepareWebFetch(documentUrl);
    try {
      const response = await request(url, {binary, credentials});
      if (response.status >= 400) {
        const error = new Error(`web fetch HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return response;
    } catch (e) {
      if (attempt === 0 && /fetcher missing/.test(e.message || '')) {
        // The document navigated itself away; load it again and retry.
        loadedDocument = null;
        continue;
      }
      throw e;
    }
  }
  throw new Error('web fetch failed');
};

/**
 * Fetches `url` from inside the WebView. Text responses come back as strings,
 * chunks as base64.
 *
 * `documents` are pages the request may be made from, best first: the
 * provider's pages carry tokens that die with the session, so a caller passes
 * every known context and the first one that answers is remembered for the rest
 * of the process. Once a context is known, it is the only one used — a 403 then
 * means "the resource is throttled", not "try another page".
 */
export async function webFetch(
  url,
  {binary = false, document, documents, credentials = 'omit'} = {},
) {
  const origin = originOf(url);
  const known = bestDocument.get(origin);

  if (known) {
    try {
      return await sendFrom(url, known, {binary, credentials});
    } catch (e) {
      if (!/fetcher missing/.test(e.message || '')) {
        bestDocument.delete(origin);
      }
      throw e;
    }
  }

  const candidates = [document, ...(documents || []), `${origin}/`].filter(
    (candidate, index, all) => candidate && all.indexOf(candidate) === index,
  );

  let lastError = null;
  for (const documentUrl of candidates) {
    try {
      const response = await sendFrom(url, documentUrl, {binary, credentials});
      bestDocument.set(origin, documentUrl);
      return response;
    } catch (e) {
      lastError = e;
      bestDocument.delete(origin);
    }
  }
  throw lastError || new Error(`web fetch failed: ${url}`);
}

export const WebFetchHost = () => {
  const ref = useRef(null);
  const [uri, setUri] = useState(null);
  const [loadToken, setLoadToken] = useState(0);
  const requestedRef = useRef(null);

  useEffect(() => {
    const detach = attachWebFetchHost({
      load: (documentUrl) => {
        console.log('web fetch host load', String(documentUrl).slice(0, 90));
        requestedRef.current = documentUrl;
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
        // The provider's pages open ads in the same view; anything that is not
        // the document the fetch needs is refused, otherwise the bootstrap is
        // lost and every chunk request has to time out.
        onShouldStartLoadWithRequest={request =>
          !requestedRef.current ||
          request.url === requestedRef.current ||
          request.url === 'about:blank'
        }
        onMessage={handleMessage}
        onHttpError={event => {
          const {statusCode, url} = event.nativeEvent;
          console.log(
            'web fetch host http',
            statusCode,
            String(url).slice(0, 90),
          );
          // The provider's pages 404 when navigated to but answer a `fetch`
          // fine, so a dead document only means "try another context".
          settleReady(new Error(`document HTTP ${statusCode}`));
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
