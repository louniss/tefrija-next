import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {View} from 'react-native';

import {FetchVideoComponent} from '../components/FetchVideoComponent';

import {downloadStream, prepareStream} from './manager';
import useStreamStore from './store';

/**
 * Runs the download queue.
 *
 * Nothing here is visible: a queued item that has never been resolved gets a
 * hidden `FetchVideoComponent`, exactly like the player uses, and its result is
 * turned into a stream record whose chunks are then fetched one by one. State
 * lives in the store, so leaving the downloads screen (or the app) does not
 * interrupt anything — the queue resumes where it stopped.
 */
export const DownloadHost = () => {
  const downloads = useStreamStore(state => state.downloads);
  const [resolving, setResolving] = useState(null);
  const runningRef = useRef(false);
  const resolvingKeyRef = useRef(null);

  const nextJob = Object.values(downloads)
    .filter(item => item.status === 'queued' || item.status === 'downloading')
    .sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0))[0];

  useEffect(() => {
    if (runningRef.current || !nextJob) {
      return;
    }
    const store = useStreamStore.getState();
    const record = store.streams[nextJob.key];

    if (!record) {
      // Resolution is done by the hidden WebView below.
      if (resolvingKeyRef.current !== nextJob.key) {
        resolvingKeyRef.current = nextJob.key;
        store.setDownload(nextJob.key, {status: 'downloading', error: null});
        setResolving(nextJob);
      }
      return;
    }

    runningRef.current = true;
    (async () => {
      try {
        await downloadStream(
          record,
          record.downloadedVariant ?? record.defaultVariant,
        );
      } catch (e) {
        if (/cancelled/.test(e.message || '')) {
          return;
        }
        console.log('download failed', nextJob.key, e.message);
        store.setDownload(nextJob.key, {status: 'error', error: e.message});
      } finally {
        runningRef.current = false;
        resolvingKeyRef.current = null;
        setResolving(null);
      }
    })();
  }, [nextJob, downloads]);

  const handleResolved = useCallback(async resolved => {
    const target = useStreamStore.getState().downloads[resolvingKeyRef.current];
    if (!target) {
      return;
    }
    try {
      const record = await prepareStream({
        type: target.type,
        id: target.id,
        season: target.season,
        episode: target.episode,
        masterUrl: resolved.url,
        playerUrl: resolved.playerUrl,
        title: target.title,
        poster: target.poster,
        year: target.year,
      });
      await downloadStream(
        record,
        record.downloadedVariant ?? record.defaultVariant,
      );
    } catch (e) {
      console.log('download preparation failed', target.key, e.message);
      useStreamStore
        .getState()
        .setDownload(target.key, {status: 'error', error: e.message});
    } finally {
      resolvingKeyRef.current = null;
      setResolving(null);
    }
  }, []);

  const handleError = useCallback(message => {
    const key = resolvingKeyRef.current;
    if (!key) {
      return;
    }
    console.log('download resolution failed', key, message);
    useStreamStore
      .getState()
      .setDownload(key, {status: 'error', error: message});
    resolvingKeyRef.current = null;
    setResolving(null);
  }, []);

  if (!resolving) {
    return null;
  }

  return (
    <View style={{width: 1, height: 1, position: 'absolute', opacity: 0}}>
      <FetchVideoComponent
        id={resolving.id}
        type={resolving.type}
        season={resolving.season}
        episode={resolving.episode}
        onDone={handleResolved}
        onError={handleError}
      />
    </View>
  );
};

export default DownloadHost;
