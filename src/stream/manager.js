import RNFS from 'react-native-fs';

import useStreamStore, {streamKey} from './store';
import {
  absolutize,
  isMasterPlaylist,
  parseMasterPlaylist,
  parseMediaPlaylist,
  originOf,
  pickDefaultVariant,
  tokenFromUrl,
  withToken,
} from './playlists';
import {webFetch} from './webFetch';

const ROOT = `${RNFS.DocumentDirectoryPath}/tefrija-streams`;

export const keyToDir = key => `${ROOT}/${key.replace(/[^a-zA-Z0-9]+/g, '_')}`;

export const segmentPath = (key, variantIndex, index) =>
  `${keyToDir(key)}/${variantIndex}/${index}.ts`;

const ensureDir = async dir => {
  if (!(await RNFS.exists(dir))) {
    await RNFS.mkdir(dir);
  }
};

export const clearStreamFiles = async key => {
  const dir = keyToDir(key);
  if (await RNFS.exists(dir)) {
    await RNFS.unlink(dir);
  }
};

export const segmentExists = (key, variantIndex, index) =>
  RNFS.exists(segmentPath(key, variantIndex, index));

/**
 * True when every chunk of a quality is already on disk, i.e. the item can be
 * played with no network at all.
 */
export const chunksComplete = async (record, variantIndex) => {
  const variant = record && record.variants && record.variants[variantIndex];
  if (!variant || !variant.segments.length) {
    return false;
  }
  const dir = `${keyToDir(record.key)}/${variantIndex}`;
  try {
    if (!(await RNFS.exists(dir))) {
      return false;
    }
    const files = await RNFS.readDir(dir);
    const cached = files.filter(file => /^\d+\.ts$/.test(file.name)).length;
    return cached >= variant.segments.length;
  } catch (e) {
    return false;
  }
};

/** Downloads one playlist/chunk and writes it to disk; returns the local path. */
export const fetchSegmentToDisk = async (record, variantIndex, index) => {
  const variant = record.variants[variantIndex];
  const segment = variant && variant.segments[index];
  if (!segment) {
    throw new Error(`unknown segment ${variantIndex}/${index}`);
  }
  const path = segmentPath(record.key, variantIndex, index);
  const dir = segmentPath(record.key, variantIndex, index).slice(
    0,
    path.lastIndexOf('/'),
  );
  await ensureDir(keyToDir(record.key));
  await ensureDir(dir);

  const response = await webFetch(withToken(segment.url, record.token), {
    binary: true,
    document: record.documentUrl || undefined,
  });
  if (response.status !== 200 || !response.b64) {
    throw new Error(`segment HTTP ${response.status}`);
  }
  await RNFS.writeFile(path, response.b64, 'base64');
  return path;
};

const inFlight = new Map();

/** A cached chunk, downloading it first when it is not on disk yet. */
export const ensureSegment = async (record, variantIndex, index) => {
  const path = segmentPath(record.key, variantIndex, index);
  if (await RNFS.exists(path)) {
    return path;
  }
  const guard = `${record.key}/${variantIndex}/${index}`;
  if (inFlight.has(guard)) {
    return inFlight.get(guard);
  }
  const job = fetchSegmentToDisk(record, variantIndex, index).finally(() => {
    inFlight.delete(guard);
  });
  inFlight.set(guard, job);
  return job;
};

const loadVariant = async (key, token, baseUrl, variant, documentUrl) => {
  const url = withToken(variant.url, token);
  const response = await webFetch(url, {document: documentUrl});
  if (response.status !== 200) {
    throw new Error(`playlist HTTP ${response.status}`);
  }
  const playlist = parseMediaPlaylist(response.text, absolutize(baseUrl, url));
  return {
    ...variant,
    url: absolutize(baseUrl, variant.url),
    segments: playlist.segments.map(segment => ({
      url: segment.url,
      duration: segment.duration,
      key: segment.key,
    })),
    targetDuration: playlist.targetDuration,
    endList: playlist.endList,
    mapUri: playlist.mapUri,
  };
};

/**
 * Turns a resolved master URL into everything the local server needs: the
 * qualities, their chunks, and the token that unlocks them. Playlists are read
 * once; after that playback only needs per-chunk downloads.
 */
export const buildStreamRecord = async ({media, masterUrl, playerUrl, docOrigin}) => {
  const token = tokenFromUrl(masterUrl);
  const documentUrl = playerUrl || undefined;
  console.log(
    'stream context',
    'player=',
    String(playerUrl || '').slice(0, 90),
    'doc=',
    docOrigin,
  );
  const response = await webFetch(masterUrl, {document: documentUrl});
  if (response.status !== 200) {
    throw new Error(`master playlist HTTP ${response.status}`);
  }

  let variants;
  if (isMasterPlaylist(response.text)) {
    const parsed = parseMasterPlaylist(response.text, masterUrl);
    if (!parsed.length) {
      throw new Error('master playlist lists no qualities');
    }
    const loaded = await Promise.all(
      parsed.map(variant =>
        loadVariant(media.key, token, masterUrl, variant, documentUrl).catch(e => {
          console.log('quality unavailable', variant.resolution, e.message);
          return null;
        }),
      ),
    );
    variants = loaded.filter(Boolean);
  } else {
    const playlist = parseMediaPlaylist(response.text, masterUrl);
    variants = [
      {
        bandwidth: 0,
        resolution: '',
        url: masterUrl,
        segments: playlist.segments.map(segment => ({
          url: segment.url,
          duration: segment.duration,
          key: segment.key,
        })),
        targetDuration: playlist.targetDuration,
        endList: playlist.endList,
        mapUri: playlist.mapUri,
      },
    ];
  }

  if (!variants.length) {
    throw new Error('no playable quality resolved');
  }

  const best = pickDefaultVariant(variants);
  let host = '';
  try {
    host = originOf(masterUrl);
  } catch (e) {}

  return {
    ...media,
    masterUrl,
    documentUrl: documentUrl || '',
    token,
    host,
    variants,
    defaultVariant: variants.indexOf(best),
    createdAt: Date.now(),
  };
};

/** Resolves + stores a stream; returns the persisted record. */
export const prepareStream = async ({
  type,
  id,
  season,
  episode,
  masterUrl,
  playerUrl,
  docOrigin,
  title,
  poster,
  year,
}) => {
  const media = {
    key: streamKey({type, id, season, episode}),
    id,
    type,
    season: type === 'tv' ? season : null,
    episode: type === 'tv' ? episode : null,
    title: title || '',
    poster: poster || '',
    year: year || '',
  };
  const cached = useStreamStore.getState().streams[media.key];
  if (cached) {
    const variant = cached.downloadedVariant ?? cached.defaultVariant;
    if (await chunksComplete(cached, variant)) {
      console.log('prepare stream', media.key, 'served from disk');
      return cached;
    }
  }

  console.log('prepare stream', media.key);
  const record = await buildStreamRecord({
    media,
    masterUrl,
    playerUrl,
    docOrigin,
  });
  console.log(
    'prepare stream ready',
    media.key,
    'qualities',
    record.variants.length,
    'chunks',
    record.variants[record.defaultVariant].segments.length,
  );
  useStreamStore.getState().setStream(record);
  return record;
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Downloads every chunk of one quality, updating the store so the downloads
 * screen and the player both see progress. Already cached chunks are skipped,
 * which makes the call resumable after an interruption.
 */
export const downloadStream = async (record, variantIndex) => {
  const store = useStreamStore.getState();
  const variant = record.variants[variantIndex];
  if (!variant) {
    throw new Error('quality not available');
  }
  const total = variant.segments.length;
  let done = 0;
  store.setDownload(record.key, {status: 'downloading', total, done, error: null});

  for (let index = 0; index < total; index++) {
    // Removing the download from the list is the cancel signal.
    const current = useStreamStore.getState().downloads[record.key];
    if (!current || current.status !== 'downloading') {
      console.log('download cancelled', record.key, done, '/', total);
      return {cancelled: true, done, total};
    }
    await ensureSegment(record, variantIndex, index);
    done += 1;
    store.setDownload(record.key, {done, total});
    if (done % 5 === 0) {
      // Keep the UI responsive between chunks.
      await sleep(0);
    }
  }

  store.setDownload(record.key, {status: 'completed', done: total, total});
  store.setStream({
    ...record,
    downloadedVariant: variantIndex,
    downloadedAt: Date.now(),
  });
  return {done, total};
};

/** Local URL of one quality's ghost playlist. */
export const localVariantUrl = (port, key, variantIndex) =>
  `http://127.0.0.1:${port}/s/${key}/${variantIndex}/playlist.m3u8`;

export const localMasterUrl = (port, key) =>
  `http://127.0.0.1:${port}/s/${key}/master.m3u8`;
