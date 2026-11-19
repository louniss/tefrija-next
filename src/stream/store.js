import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';

/**
 * Everything the stream server and the downloads screen need to know about
 * resolved streams. Persisted, so a resolved (or fully downloaded) stream keeps
 * working after the app is restarted and after navigating away from the player.
 *
 * `streams[key]` — a resolved media item:
 *   {key, id, type, season, episode, title, poster, year,
 *    masterUrl, token, host, variants: [{bandwidth, resolution, url, segments}],
 *    defaultVariant, createdAt, expiresAt}
 * `downloads[key]` — download bookkeeping for the same key:
 *   {key, status, done, total, error, updatedAt}
 */

const initialState = {
  hydrated: false,
  streams: {},
  downloads: {},
};

export const streamKey = ({type, id, season, episode}) =>
  type === 'tv' ? `tv:${id}:${season}:${episode}` : `movie:${id}`;

const useStreamStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      markHydrated() {
        set({hydrated: true});
      },

      setStream(record) {
        set(state => {
          const streams = {...state.streams, [record.key]: record};
          // Resolved playlists are cached for instant offline reuse; only the
          // most recent ones matter, and downloads are never dropped.
          const keep = Object.values(streams)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            .filter(
              (item, index) =>
                index < 12 || Object.prototype.hasOwnProperty.call(state.downloads, item.key),
            );
          const pruned = {};
          keep.forEach(item => {
            pruned[item.key] = item;
          });
          return {streams: pruned};
        });
      },

      getStream(key) {
        return get().streams[key] || null;
      },

      /** Forgets a resolved stream but keeps its download entry (and files). */
      dropStream(key) {
        const streams = {...get().streams};
        delete streams[key];
        set({streams});
      },

      removeStream(key) {
        const downloads = {...get().downloads};
        delete downloads[key];
        const streams = {...get().streams};
        delete streams[key];
        set({streams, downloads});
      },

      setDownload(key, patch) {
        const current = get().downloads[key] || {};
        set(state => ({
          downloads: {
            ...state.downloads,
            [key]: {...current, ...patch, key, updatedAt: Date.now()},
          },
        }));
      },

      /**
       * Refreshes the show metadata on existing downloads. The title belongs to
       * the show, not to the row that created it, so opening the show page is
       * the moment to correct names written by an older (or wrong) entry.
       */
      syncDownloadMeta({type, id, title, poster, year}) {
        const downloads = {...get().downloads};
        let changed = false;
        Object.values(downloads).forEach(item => {
          if (item.type !== type || String(item.id) !== String(id)) {
            return;
          }
          const patch = {};
          if (title && item.title !== title) {
            patch.title = title;
          }
          if (poster && item.poster !== poster) {
            patch.poster = poster;
          }
          if (year && item.year !== year) {
            patch.year = year;
          }
          if (Object.keys(patch).length) {
            downloads[item.key] = {...item, ...patch};
            changed = true;
          }
        });
        if (changed) {
          set({downloads});
        }
      },

      /** Stops a running download but keeps what already arrived. */
      pauseDownload(key) {
        const current = get().downloads[key];
        // A queued item has not started yet, but pausing it must work too: the
        // row shows the same pause affordance while it waits.
        if (!current || (current.status !== 'downloading' && current.status !== 'queued')) {
          return;
        }
        set(state => ({
          downloads: {
            ...state.downloads,
            [key]: {...current, status: 'paused', updatedAt: Date.now()},
          },
        }));
      },

      /** Continues a paused (or failed) download from the cached chunks. */
      resumeDownload(key) {
        const current = get().downloads[key];
        if (!current) {
          return;
        }
        get().setDownload(key, {status: 'queued', error: null});
      },

      clearDownload(key) {
        const downloads = {...get().downloads};
        delete downloads[key];
        set({downloads});
      },

      /** Schedules a download; the resolution happens later, on the host. */
      queueDownload(item) {
        const existing = get().downloads[item.key];
        // A finished download is final, unless chunks had to be skipped: those
        // are worth another try on a later day.
        if (
          existing &&
          (existing.status === 'downloading' ||
            existing.status === 'queued' ||
            (existing.status === 'completed' && !existing.skipped))
        ) {
          return;
        }
        get().setDownload(item.key, {
          ...item,
          status: 'queued',
          done: 0,
          total: 0,
          error: null,
          skipped: 0,
          // Fixed at queue time so the list never reorders while it downloads.
          createdAt: (existing && existing.createdAt) || Date.now(),
        });
      },
    }),
    {
      name: 'tefrijaStreams',
      storage: createJSONStorage(() => AsyncStorage),
      // Stream records are far too big for AsyncStorage rows: they live on disk
      // (see manager.saveRecord). Only the download list is persisted here.
      partialize: state => ({downloads: state.downloads}),
      onRehydrateStorage: () => state => {
        if (state) {
          state.markHydrated();
        }
      },
    },
  ),
);

export const sortDownloads = downloads =>
  Object.values(downloads).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

export default useStreamStore;
