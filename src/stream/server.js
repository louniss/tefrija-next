import {HttpServer} from 'react-native-nitro-http-server';
import RNFS from 'react-native-fs';

import useStreamStore from './store';
import {
  MASTER_CONTENT_TYPE,
  SEGMENT_CONTENT_TYPE,
  buildGhostMasterPlaylist,
  buildGhostMediaPlaylist,
} from './playlists';
import {
  cachedIndices,
  ensureSegment,
  loadRecord,
  segmentPath,
} from './manager';

/**
 * Local HTTP server the video player talks to.
 *
 * The player never sees the provider's CDN: it gets ghost playlists pointing at
 * 127.0.0.1, and every chunk request is answered from the cache or, on a miss,
 * downloaded from the CDN first. That keeps both the playlist and the chunks
 * inside the app's own network layer, and makes a fully downloaded item playable
 * with no network at all.
 */

const base64ToArrayBuffer = b64 => {
  const binary = global.atob ? global.atob(b64) : '';
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

/** Decoded size of a base64 string, padding included. */
const base64ByteLength = b64 => {
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return (b64.length * 3) / 4 - padding;
};

const textResponse = body => ({
  statusCode: 200,
  headers: {
    'Content-Type': MASTER_CONTENT_TYPE,
    'Cache-Control': 'no-store',
  },
  body,
});

const notFound = message => ({
  statusCode: 404,
  headers: {'Content-Type': 'text/plain'},
  body: message,
});

let server = null;
let starting = null;
let listeningPort = 0;

const handle = async request => {
  const path = String(request.path || '').split('?')[0];
  const parts = path.split('/').filter(Boolean);

  if (path === '/health' || path === '/') {
    return {statusCode: 200, headers: {'Content-Type': 'text/plain'}, body: 'ok'};
  }

  if (parts[0] !== 's' || parts.length < 3) {
    return notFound('not found');
  }

  const key = decodeURIComponent(parts[1]);
  const record =
    useStreamStore.getState().streams[key] || (await loadRecord(key));
  if (!record) {
    return notFound(`unknown stream ${key}`);
  }

  // /s/<key>/master.m3u8
  if (parts[2] === 'master.m3u8') {
    const port = listeningPort;
    return textResponse(
      buildGhostMasterPlaylist(record.variants, index =>
        `http://127.0.0.1:${port}/s/${key}/${index}/playlist.m3u8`,
      ),
    );
  }

  const variantIndex = parseInt(parts[2], 10);
  const variant = record.variants[variantIndex];
  if (!variant) {
    return notFound(`unknown quality ${parts[2]}`);
  }

  /* An item with a download entry is served from disk only: its playback must
   * not depend on the CDN (a paused or interrupted download still has to play
   * offline). Only the chunks that are here are listed, so the player never
   * asks for one that would have to be fetched. Streaming (no download entry)
   * keeps fetching on demand, which is also what fills the cache in the first
   * place. */
  const download = useStreamStore.getState().downloads[key];
  const cached = download ? await cachedIndices(record, variant) : null;

  // /s/<key>/<variant>/playlist.m3u8
  if (parts[3] === 'playlist.m3u8') {
    const missing = new Set(variant.missing || []);
    if (cached && cached.size) {
      variant.segments.forEach((_, index) => {
        if (!cached.has(index)) {
          missing.add(index);
        }
      });
    }
    return textResponse(
      buildGhostMediaPlaylist(
        variant,
        index =>
          index < 0
            ? `${path.slice(0, path.lastIndexOf('/'))}/map.ts`
            : `http://127.0.0.1:${listeningPort}/s/${key}/${variantIndex}/${index}.ts`,
        missing,
      ),
    );
  }

  // /s/<key>/<variant>/<index>.ts
  const index = parseInt(parts[3], 10);
  if (!isNaN(index)) {
    try {
      if (!download) {
        await ensureSegment(record, variantIndex, index);
      }
      const b64 = await RNFS.readFile(
        segmentPath(key, variant, index),
        'base64',
      );
      return {
        statusCode: 200,
        headers: {
          'Content-Type': SEGMENT_CONTENT_TYPE,
          'Content-Length': String(base64ByteLength(b64)),
          'Cache-Control': 'no-store',
        },
        body: base64ToArrayBuffer(b64),
      };
    } catch (e) {
      console.log('chunk failed', key, variantIndex, index, e.message);
      return {
        statusCode: 502,
        headers: {'Content-Type': 'text/plain'},
        body: `chunk unavailable: ${e.message}`,
      };
    }
  }

  return notFound('not found');
};

/**
 * Starts the loopback server once and returns its port.
 *
 * The native server is a singleton, so a second `start()` silently replaces the
 * first one: the resolved port is cached here instead of asking the native side
 * whether it is still alive.
 */
export const ensureStreamServer = async () => {
  if (starting) {
    return starting;
  }
  if (listeningPort) {
    return listeningPort;
  }
  starting = (async () => {
    const instance = new HttpServer();
    const port = await instance.start(0, handle, {
      host: '127.0.0.1',
      autoRestart: true,
    });
    server = instance;
    listeningPort = port;
    console.log('stream server listening on', port);
    return port;
  })();
  try {
    return await starting;
  } finally {
    starting = null;
  }
};

export const streamServerPort = () => listeningPort;

export const stopStreamServer = async () => {
  if (server) {
    await server.stop();
    server = null;
    listeningPort = 0;
  }
};
