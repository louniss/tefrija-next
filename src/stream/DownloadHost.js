import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef} from 'react';
import {View} from 'react-native';

import {FetchVideoComponent} from '../components/FetchVideoComponent';

import {downloadStream, prepareStream} from './manager';
import useStreamStore from './store';

const nextJobOf = downloads =>
  Object.values(downloads)
    .filter(item => item.status === 'queued' || item.status === 'downloading')
    .sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0))[0] || null;

/**
 * Runs the download queue.
 *
 * Nothing here is visible: a queued item that has never been resolved gets a
 * hidden `FetchVideoComponent`, exactly like the player uses, and its result is
 * turned into a stream record whose chunks are then fetched in parallel. State
 * lives in the store, so leaving the downloads screen (or restarting the app)
 * resumes the queue instead of restarting it.
 *
 * What to do next is *derived* from the store rather than kept in local state:
 * an effect that sets state while deciding what to do next re-renders itself
 * forever.
 */
export const DownloadHost = () => {
  const downloads = useStreamStore(state => state.downloads);
  const streams = useStreamStore(state => state.streams);
  const runningRef = useRef(false);
  /* A long download can outlive its playlist token or hit a CDN hiccup; one
   * automatic re-resolve resumes it from the chunks already on disk. */
  const retriesRef = useRef({});

  const job = useMemo(() => nextJobOf(downloads), [downloads]);
  const record = job ? streams[job.key] : null;
  const needsResolve = !!job && !record;

  const runDownload = useCallback(async item => {
    const store = useStreamStore.getState();
    const stream = store.streams[item.key];
    if (!stream) {
      return;
    }
    try {
      await downloadStream(
        stream,
        stream.downloadedVariant ?? stream.defaultVariant,
      );
      retriesRef.current[item.key] = 0;
    } catch (e) {
      if (/cancelled/.test(e.message || '')) {
        return;
      }
      // The stored playlists are what failed (dead token or dead context):
      // dropping them makes the next attempt resolve the item from scratch
      // instead of repeating the same failure. Cached chunks are kept, so the
      // download continues from where it stopped.
      store.dropStream(item.key);
      const retries = retriesRef.current[item.key] || 0;
      if (retries < 1) {
        retriesRef.current[item.key] = retries + 1;
        console.log('download will re-resolve and resume', item.key, e.message);
        store.setDownload(item.key, {status: 'downloading', error: null});
        return;
      }
      console.log('download failed', item.key, e.message);
      store.setDownload(item.key, {status: 'error', error: e.message});
    }
  }, []);

  useEffect(() => {
    if (!job || !record || runningRef.current) {
      return;
    }
    runningRef.current = true;
    runDownload(job).finally(() => {
      runningRef.current = false;
    });
  }, [job, record, runDownload]);

  const handleResolved = useCallback(async (item, resolved) => {
    try {
      await prepareStream({
        type: item.type,
        id: item.id,
        season: item.season,
        episode: item.episode,
        masterUrl: resolved.url,
        playerUrl: resolved.playerUrl,
        docUrl: resolved.docUrl,
        docOrigin: resolved.docOrigin,
        title: item.title,
        poster: item.poster,
        year: item.year,
      });
      // The effect above starts the download as soon as the record exists.
    } catch (e) {
      console.log('download preparation failed', item.key, e.message);
      const store = useStreamStore.getState();
      store.dropStream(item.key);
      store.setDownload(item.key, {status: 'error', error: e.message});
    }
  }, []);

  const handleError = useCallback((item, message) => {
    console.log('download resolution failed', item.key, message);
    const store = useStreamStore.getState();
    store.dropStream(item.key);
    store.setDownload(item.key, {status: 'error', error: message});
  }, []);

  if (!needsResolve) {
    return null;
  }

  return (
    <View style={{width: 1, height: 1, position: 'absolute', opacity: 0}}>
      <FetchVideoComponent
        id={job.id}
        type={job.type}
        season={job.season}
        episode={job.episode}
        onDone={resolved => handleResolved(job, resolved)}
        onError={message => handleError(job, message)}
      />
    </View>
  );
};

export default DownloadHost;
