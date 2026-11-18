import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef} from 'react';
import {View} from 'react-native';

import {FetchVideoComponent} from '../components/FetchVideoComponent';

import {
  acceptMissingChunks,
  downloadStream,
  forgetStream,
  hydrateRecords,
  prepareStream,
} from './manager';
import useStreamStore from './store';

/** Items that want to run right now, oldest first. Paused ones stay out. */
const activeJobsOf = downloads =>
  Object.values(downloads)
    .filter(item => item.status === 'queued' || item.status === 'downloading')
    .sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));

/* Items downloading at the same time — a whole season does not have to wait
 * for the previous episode to finish. */
const MAX_CONCURRENT_DOWNLOADS = 3;

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
  const runningRef = useRef(new Set());
  /* A long download can outlive its playlist token or hit a CDN hiccup; one
   * automatic re-resolve resumes it from the chunks already on disk. */
  const retriesRef = useRef({});

  // After a restart the records are on disk, not in the store.
  useEffect(() => {
    const keys = Object.values(useStreamStore.getState().downloads).map(
      item => item.key,
    );
    if (keys.length) {
      hydrateRecords(keys);
    }
  }, [downloads]);

  const jobs = useMemo(() => activeJobsOf(downloads), [downloads]);
  // One item at a time is resolved (a single hidden WebView drives the flow);
  // everything already resolved downloads in parallel.
  const resolveJob = useMemo(
    () => jobs.find(item => !streams[item.key]) || null,
    [jobs, streams],
  );

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
      const retries = retriesRef.current[item.key] || 0;
      // The stored playlists are what failed (dead token or dead context), so
      // the next attempt resolves the item from scratch. Cached chunks are
      // kept, so it continues where it stopped instead of restarting.
      if (e.retryable && retries < 1) {
        retriesRef.current[item.key] = retries + 1;
        console.log('download will re-resolve and resume', item.key, e.message);
        await forgetStream(item.key);
        store.setDownload(item.key, {status: 'downloading', error: null});
        return;
      }
      if (e.missing && e.missing.length) {
        // A chunk the CDN will never serve: keep the rest and play around it.
        await acceptMissingChunks(
          stream,
          stream.downloadedVariant ?? stream.defaultVariant,
          e.missing,
        );
        store.setDownload(item.key, {
          status: 'completed',
          error: null,
          skipped: e.missing.length,
        });
        console.log('download completed with gaps', item.key, e.missing.length);
        return;
      }
      console.log('download failed', item.key, e.message);
      await forgetStream(item.key);
      store.setDownload(item.key, {status: 'error', error: e.message});
    }
  }, []);

  useEffect(() => {
    for (const job of jobs) {
      if (runningRef.current.size >= MAX_CONCURRENT_DOWNLOADS) {
        break;
      }
      if (runningRef.current.has(job.key) || !streams[job.key]) {
        continue;
      }
      runningRef.current.add(job.key);
      runDownload(job).finally(() => runningRef.current.delete(job.key));
    }
  }, [jobs, streams, runDownload]);

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
      await forgetStream(item.key);
      store.setDownload(item.key, {status: 'error', error: e.message});
    }
  }, []);

  const handleError = useCallback((item, message) => {
    console.log('download resolution failed', item.key, message);
    const store = useStreamStore.getState();
    store.dropStream(item.key);
    store.setDownload(item.key, {status: 'error', error: message});
  }, []);

  if (!resolveJob) {
    return null;
  }

  return (
    <View style={{width: 1, height: 1, position: 'absolute', opacity: 0}}>
      <FetchVideoComponent
        key={resolveJob.key}
        id={resolveJob.id}
        type={resolveJob.type}
        season={resolveJob.season}
        episode={resolveJob.episode}
        onDone={resolved => handleResolved(resolveJob, resolved)}
        onError={message => handleError(resolveJob, message)}
      />
    </View>
  );
};

export default DownloadHost;
