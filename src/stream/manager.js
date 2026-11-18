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

/**
 * Chunks are stored per quality, keyed by the resolution rather than by the
 * quality's position in the playlist: a re-resolve may list the qualities in
 * another order (or drop one), and its reported bandwidth changes between
 * resolves, so neither index nor bandwidth identifies a quality reliably.
 */
const variantSignature = variant =>
  (variant.resolution || 'auto').replace(/[^0-9x]/gi, '') || 'auto';

export const variantDir = (key, variant) =>
  `${keyToDir(key)}/${variant.dir || variantSignature(variant)}`;

export const segmentPath = (key, variant, index) =>
  `${variantDir(key, variant)}/${index}.ts`;

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

export const segmentExists = (key, variant, index) =>
  RNFS.exists(segmentPath(key, variant, index));

/** Indices already on disk for one quality. */
export const cachedIndices = async (record, variant) => {
  try {
    const dir = variantDir(record.key, variant);
    if (!(await RNFS.exists(dir))) {
      return new Set();
    }
    const files = await RNFS.readDir(dir);
    const indices = new Set();
    files.forEach(file => {
      const match = /^(\d+)\.ts$/.exec(file.name);
      if (match) {
        indices.add(parseInt(match[1], 10));
      }
    });
    return indices;
  } catch (e) {
    return new Set();
  }
};

/**
 * True when every chunk of a quality is already on disk, i.e. the item can be
 * played with no network at all.
 */
export const chunksComplete = async (record, variantIndex) => {
  const variant = record && record.variants && record.variants[variantIndex];
  if (!variant || !variant.segments.length) {
    return false;
  }
  const cached = await cachedIndices(record, variant);
  return (
    cached.size + (variant.missing ? variant.missing.length : 0) >=
    variant.segments.length
  );
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/* The CDN starts answering 403 when chunks are pulled too fast; waiting and
 * asking again is what turns that into a slow download instead of a failure. */
const RETRY_DELAYS_MS = [5000, 15000, 30000];
/* Chunks are small; three at a time keeps a download moving without looking
 * like a burst to the CDN's rate limiting. */
const DOWNLOAD_WORKERS = 3;
const isThrottled = error =>
  !error.status || error.status === 403 || error.status === 429 || error.status >= 500;

/** Downloads one playlist/chunk and writes it to disk; returns the local path. */
export const fetchSegmentToDisk = async (record, variantIndex, index) => {
  const variant = record.variants[variantIndex];
  const segment = variant && variant.segments[index];
  if (!segment) {
    throw new Error(`unknown segment ${variantIndex}/${index}`);
  }
  const path = segmentPath(record.key, variant, index);
  await ensureDir(keyToDir(record.key));
  await ensureDir(variantDir(record.key, variant));

  const segmentUrl = withToken(segment.url, record.token);
  let response = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      response = await webFetch(segmentUrl, {
        binary: true,
        documents: record.fetchContexts || undefined,
      });
      if (response.status !== 200) {
        const error = new Error(`segment HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      break;
    } catch (e) {
      console.log(
        'chunk failed',
        variantIndex,
        index,
        e.message,
        'attempt',
        attempt + 1,
        segmentUrl.split('?')[0].slice(0, 100),
      );
      if (attempt === RETRY_DELAYS_MS.length || !isThrottled(e)) {
        throw e;
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
      response = null;
    }
  }
  if (!response || !response.b64) {
    throw new Error(`segment unavailable ${variantIndex}/${index}`);
  }
  await RNFS.writeFile(path, response.b64, 'base64');
  return path;
};

const inFlight = new Map();

/** A cached chunk, downloading it first when it is not on disk yet. */
export const ensureSegment = async (record, variantIndex, index) => {
  const variant = record.variants[variantIndex];
  if (!variant) {
    throw new Error(`unknown quality ${variantIndex}`);
  }
  const path = segmentPath(record.key, variant, index);
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

const loadVariant = async (key, token, baseUrl, variant, contexts) => {
  const url = withToken(variant.url, token);
  const response = await webFetch(url, {documents: contexts});
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
/**
 * Pages the CDN accepts as the origin of a playlist request, best first.
 *
 * The provider's player page is ideal — its Referer is exactly what a real
 * playback sends — but it answers `fetch` and refuses to be navigated to (it
 * 404s), so the landing page and the site root are tried as fallbacks.
 */
const documentCandidates = ({playerUrl, docUrl, docOrigin}) => {
  // The landing host's own root is the only stable context: player/landing urls
  // carry tokens that are consumed after a single load, while a plain page on
  // that host keeps working for the whole session.
  const candidates = [
    docOrigin ? `${docOrigin}/` : '',
    playerUrl,
    docUrl,
  ];
  return candidates.filter(
    (url, index) => url && candidates.indexOf(url) === index,
  );
};

/**
 * Fetches the master playlist from the first context that answers it, and
 * reports which context worked so the chunks are fetched the same way.
 */
const readMasterPlaylist = async (masterUrl, candidates) => {
  const response = await webFetch(masterUrl, {documents: candidates});
  if (response.status !== 200) {
    throw new Error(`master playlist HTTP ${response.status}`);
  }
  return response;
};

export const buildStreamRecord = async ({
  media,
  masterUrl,
  playerUrl,
  docUrl,
  docOrigin,
}) => {
  const token = tokenFromUrl(masterUrl);
  const contexts = documentCandidates({playerUrl, docUrl, docOrigin});
  console.log('stream contexts', contexts.length);
  const response = await readMasterPlaylist(masterUrl, contexts);
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
        loadVariant(media.key, token, masterUrl, variant, contexts).catch(e => {
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

  // A stable name per quality, so cached chunks survive a re-resolve.
  const seen = new Map();
  variants.forEach(variant => {
    const base = variantSignature(variant);
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    variant.dir = count ? `${base}_${count}` : base;
  });

  const best = pickDefaultVariant(variants);
  let host = '';
  try {
    host = originOf(masterUrl);
  } catch (e) {}

  return {
    ...media,
    masterUrl,
    fetchContexts: contexts,
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
  docUrl,
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
    docUrl,
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

/**
 * Downloads every chunk of one quality.
 *
 * A few chunks are pulled at a time and progress starts from what is already on
 * disk, so a retry resumes where the previous attempt stopped instead of
 * starting over. A chunk that keeps failing is re-queued once at the end rather
 * than blocking the rest of the download.
 */
export const downloadStream = async (record, variantIndex) => {
  const store = useStreamStore.getState();
  const variant = record.variants[variantIndex];
  if (!variant) {
    throw new Error('quality not available');
  }
  const total = variant.segments.length;
  const cached = await cachedIndices(record, variant);
  const missing = [];
  for (let index = 0; index < total; index++) {
    if (!cached.has(index)) {
      missing.push(index);
    }
  }

  let done = total - missing.length;
  store.setDownload(record.key, {
    status: 'downloading',
    total,
    done,
    error: null,
  });
  if (done) {
    console.log('download resumes', record.key, done, '/', total);
  }

  const isCancelled = () => {
    const current = useStreamStore.getState().downloads[record.key];
    return !current || current.status !== 'downloading';
  };

  const queue = [...missing];
  const failed = [];
  let cursor = 0;

  const worker = async () => {
    while (cursor < queue.length) {
      if (isCancelled()) {
        return;
      }
      const index = queue[cursor++];
      try {
        await fetchSegmentToDisk(record, variantIndex, index);
        done += 1;
        store.setDownload(record.key, {done, total});
        if (done % 25 === 0) {
          console.log('download progress', record.key, done, '/', total);
        }
      } catch (e) {
        console.log('chunk parked', record.key, index, e.message);
        failed.push({index, status: e.status});
      }
    }
  };

  const workers = [];
  for (let i = 0; i < Math.min(DOWNLOAD_WORKERS, queue.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  if (isCancelled()) {
    console.log('download cancelled', record.key, done, '/', total);
    return {cancelled: true, done, total};
  }

  if (failed.length) {
    const indices = failed.map(item => item.index);
    const sample = indices.slice(0, 3).join(', ');
    const error = new Error(
      `${failed.length} chunk${failed.length === 1 ? '' : 's'} unavailable (${sample})`,
    );
    // The caller decides whether to retry or to play around the gap: a 404 is
    // the file itself being absent (a retry changes nothing), anything else is
    // probably about the token and worth one fresh resolve.
    error.missing = indices;
    error.retryable = failed.some(item => item.status !== 404);
    throw error;
  }

  store.setDownload(record.key, {status: 'completed', done: total, total});
  store.setStream({
    ...record,
    downloadedVariant: variantIndex,
    downloadedAt: Date.now(),
  });
  return {done, total};
};

/**
 * Accepts a quality with permanent holes: the chunks are remembered so the
 * ghost playlist leaves them out instead of making the whole item unplayable.
 */
export const acceptMissingChunks = (record, variantIndex, indices) => {
  const variants = record.variants.map((variant, index) => {
    if (index !== variantIndex) {
      return variant;
    }
    const missing = new Set(variant.missing || []);
    indices.forEach(chunk => missing.add(chunk));
    return {...variant, missing: [...missing].sort((a, b) => a - b)};
  });
  const updated = {...record, variants, downloadedVariant: variantIndex};
  useStreamStore.getState().setStream(updated);
  return updated;
};

/** Local URL of one quality's ghost playlist. */
export const localVariantUrl = (port, key, variantIndex) =>
  `http://127.0.0.1:${port}/s/${key}/${variantIndex}/playlist.m3u8`;

export const localMasterUrl = (port, key) =>
  `http://127.0.0.1:${port}/s/${key}/master.m3u8`;
