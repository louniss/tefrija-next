import * as React from 'react';
import WebView from 'react-native-webview';

import {useCallback, useEffect, useRef, useState} from 'react';

import {View} from 'react-native';

import {
  STREAM_UNAVAILABLE_MESSAGE,
  getFlow,
  refreshFlow,
} from './resolveFlow';

const EMBED_ORIGIN = 'https://vsembed.ru';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36';

const RESOLVE_TIMEOUT_MS = 30000;

/**
 * Resolves the .m3u8 stream URL for a movie/tv item.
 *
 * The resolution logic itself is not part of the app: it is downloaded from the
 * resolver worker (see `resolveFlow.js` / `worker.js`) and injected into this
 * WebView. That keeps the provider's churn (moved APIs, new tokens, new gate
 * pages) fixable by deploying a worker instead of shipping an app update.
 *
 * Lifecycle:
 *   1. the cached flow is used; a cold install downloads it first
 *   2. the flow runs in two stages inside the WebView — the embed page mints a
 *      gate token and redirects to the provider's landing page, which is where
 *      the stream can actually be resolved
 *   3. on failure the flow is downloaded again and, if the version changed, the
 *      WebView is remounted and the new flow is retried
 *   4. if the version did not change (or cannot be fetched) the failure is
 *      upstream: `onError` reports that streaming is temporarily unavailable
 */
export const FetchVideoComponent = ({
  id,
  type,
  season,
  episode,
  onDone,
  onError,
}) => {
  const [flow, setFlow] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const doneRef = useRef(false);
  const refreshedRef = useRef(false);
  const flowRef = useRef(null);
  flowRef.current = flow;

  // The parent re-creates these callbacks on every render; keep them in refs so
  // the flow is loaded once and the retry logic stays stable.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const reportUnavailable = useCallback(() => {
    if (onErrorRef.current) {
      onErrorRef.current(STREAM_UNAVAILABLE_MESSAGE);
    }
  }, []);

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

  useEffect(() => {
    let cancelled = false;
    getFlow()
      .then(loaded => {
        if (!cancelled) {
          setFlow(loaded);
        }
      })
      .catch(e => {
        console.log('resolve flow unavailable', e);
        if (!cancelled) {
          reportUnavailable();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reportUnavailable]);

  // A new attempt may refresh the flow once more.
  useEffect(() => {
    refreshedRef.current = false;
    doneRef.current = false;
  }, [attempt]);

  // Different media: start over.
  useEffect(() => {
    doneRef.current = false;
    refreshedRef.current = false;
  }, [embedUrl]);

  /**
   * Fallback for the stream token: the flow normally appends it from inside the
   * page, but an older remote flow may hand us a bare URL.
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

  const recover = useCallback(
    async reason => {
      if (refreshedRef.current) {
        console.log('resolve failed after flow refresh:', reason);
        reportUnavailable();
        return;
      }
      refreshedRef.current = true;

      const current = flowRef.current;
      try {
        const {flow: next, changed} = await refreshFlow(
          current && current.version,
        );
        if (!changed) {
          console.log('resolve failed, flow unchanged:', next.version, reason);
          reportUnavailable();
          return;
        }
        console.log(
          'resolve flow updated',
          (current && current.version) || '(none)',
          '->',
          next.version,
        );
        setFlow(next);
        setAttempt(n => n + 1);
      } catch (e) {
        console.log('resolve flow refresh failed', e);
        reportUnavailable();
      }
    },
    [reportUnavailable],
  );

  const handleMessage = async event => {
    if (doneRef.current) {
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
        doneRef.current = true;
        const url = await withStreamToken(data.url);
        console.log('m3u8 found', url);
        onDoneRef.current(url);
        break;
      }

      case 'error':
        console.log(
          'resolve error',
          data.message,
          'stage=',
          data.stage,
          'flow=',
          data.v,
        );
        recover(data.message);
        break;

      case 'progress':
        console.log('resolve progress', data.stage, 'flow=', data.v);
        break;

      case 'diag':
        console.log('resolve diag', JSON.stringify(data));
        break;

      default:
        break;
    }
  };

  if (!flow) {
    return <View />;
  }

  const injected = `window.__VS_ARGS = ${JSON.stringify({
    version: flow.version,
    srcApi,
    embedUrl,
    mediaKey: `${type}:${id}:${season == null ? '' : season}:${
      episode == null ? '' : episode
    }`,
    season: season == null ? null : String(season),
    episode: episode == null ? null : String(episode),
    timeout: RESOLVE_TIMEOUT_MS,
  })};\n${flow.script}`;

  return (
    <View>
      <WebView
        // Remount to replay the flow when a newer version was downloaded.
        key={`${flow.version}-${attempt}`}
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
        injectedJavaScriptBeforeContentLoaded={injected}
        injectedJavaScript={injected}
        onMessage={handleMessage}
        onError={syntheticEvent => {
          const {nativeEvent} = syntheticEvent;
          // A failed navigation is also "the flow could not run": give a newer
          // flow a chance before telling the user streaming is down.
          console.log('webview error', nativeEvent.description);
          recover(nativeEvent.description || 'webview error');
        }}
      />
    </View>
  );
};
