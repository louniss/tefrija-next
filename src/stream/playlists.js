/**
 * HLS playlist helpers used by the local stream server.
 *
 * The provider hands out a master playlist whose children and chunks are only
 * reachable with the playlist token appended, and whose URIs are relative. The
 * server transforms those playlists into "ghost" ones that point back at
 * http://127.0.0.1:<port> so the player never talks to the CDN directly.
 */

export const MASTER_CONTENT_TYPE = 'application/vnd.apple.mpegurl';
export const SEGMENT_CONTENT_TYPE = 'video/mp2t';

const URL_PARTS = /^(https?:)\/\/([^/?#]*)([^?#]*)(\?[^#]*)?/i;

/**
 * React Native's `URL` treats the base as a directory (`new URL('a.ts',
 * '.../x.m3u8')` gives `.../x.m3u8/a.ts`), so relative URIs are resolved by hand.
 */
export const absolutize = (base, uri) => {
  if (!uri) {
    return uri;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(uri)) {
    return uri;
  }
  const parts = URL_PARTS.exec(base || '');
  if (!parts) {
    return uri;
  }
  const origin = `${parts[1]}//${parts[2]}`;
  if (uri.startsWith('//')) {
    return `${parts[1]}${uri}`;
  }
  if (uri.startsWith('/')) {
    return origin + uri;
  }
  if (uri.startsWith('?')) {
    return origin + parts[3] + uri;
  }
  const path = parts[3] || '/';
  const dir = path.slice(0, path.lastIndexOf('/') + 1);
  const segments = [];
  for (const segment of `${dir}${uri}`.split('/')) {
    if (segment === '..') {
      segments.pop();
    } else if (segment !== '.') {
      segments.push(segment);
    }
  }
  return origin + segments.join('/');
};

/** `https://host:port` of an absolute url (no `new URL` quirks). */
export const originOf = (url) => {
  const parts = URL_PARTS.exec(url || '');
  return parts ? `${parts[1]}//${parts[2]}` : '';
};

export const tokenFromUrl = (url) => {
  const match = /[?&]token=([^&#]+)/.exec(url || '');
  return match ? decodeURIComponent(match[1]) : '';
};

/** Adds the stream token to a playlist/chunk URL that does not carry one yet. */
export const withToken = (uri, token) => {
  if (!uri || !token || /[?&]token=/.test(uri)) {
    return uri;
  }
  return uri + (uri.indexOf('?') > -1 ? '&' : '?') + 'token=' + token;
};

const attribute = (line, name) => {
  const match = new RegExp(`${name}=("[^"]*"|[^,]*)`).exec(line);
  if (!match) {
    return null;
  }
  return match[1].replace(/^"|"$/g, '');
};

export const isMasterPlaylist = (text) =>
  typeof text === 'string' && /^#EXT-X-STREAM-INF/m.test(text);

/**
 * Master playlist -> [{bandwidth, resolution, url}], best quality last.
 */
export const parseMasterPlaylist = (text, baseUrl) => {
  const lines = String(text).split(/\r?\n/);
  const variants = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('#EXT-X-STREAM-INF')) {
      continue;
    }
    let next = i + 1;
    while (next < lines.length && !lines[next].trim()) {
      next++;
    }
    const uri = (lines[next] || '').trim();
    if (!uri || uri.startsWith('#')) {
      continue;
    }
    const width = attribute(line, 'RESOLUTION');
    variants.push({
      bandwidth: parseInt(attribute(line, 'BANDWIDTH'), 10) || 0,
      resolution: width || '',
      url: absolutize(baseUrl, uri),
    });
  }
  return variants.sort((a, b) => a.bandwidth - b.bandwidth);
};

/** Highest bandwidth first. */
export const pickDefaultVariant = (variants) =>
  variants.reduce(
    (best, variant) =>
      !best || variant.bandwidth > best.bandwidth ? variant : best,
    null,
  );

/**
 * Media playlist -> {segments, durations, targetDuration, endList, mapUri,
 * keyUri}. URIs stay as written; callers absolutize them.
 */
export const parseMediaPlaylist = (text, baseUrl) => {
  const lines = String(text).split(/\r?\n/);
  const segments = [];
  const durations = [];
  let targetDuration = 0;
  let endList = false;
  let mapUri = null;
  let keyUri = null;
  let pendingDuration = 0;
  let pendingKey = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      continue;
    }
    if (line.startsWith('#EXT-X-TARGETDURATION')) {
      targetDuration = parseFloat(line.split(':')[1]) || 0;
      continue;
    }
    if (line.startsWith('#EXT-X-ENDLIST')) {
      endList = true;
      continue;
    }
    if (line.startsWith('#EXT-X-MAP')) {
      mapUri = absolutize(baseUrl, attribute(line, 'URI'));
      continue;
    }
    if (line.startsWith('#EXT-X-KEY')) {
      const method = attribute(line, 'METHOD');
      const uri = attribute(line, 'URI');
      pendingKey = uri ? {method, uri: absolutize(baseUrl, uri)} : null;
      keyUri = pendingKey;
      continue;
    }
    if (line.startsWith('#EXTINF')) {
      pendingDuration = parseFloat(line.slice(line.indexOf(':') + 1)) || 0;
      continue;
    }
    if (line.startsWith('#')) {
      continue;
    }
    segments.push({
      url: absolutize(baseUrl, line),
      duration: pendingDuration,
      key: pendingKey,
    });
    durations.push(pendingDuration);
    if (pendingKey && pendingKey.method === 'NONE') {
      pendingKey = null;
    }
    pendingDuration = 0;
  }

  return {segments, durations, targetDuration, endList, mapUri, keyUri};
};

const tagDuration = (value) => (Math.round(value * 1000) / 1000).toString();

/**
 * Rewrites a media playlist so every URI is produced by `mapUri`.
 *
 * `skip` drops chunks the CDN will not serve. A dropped chunk leaves a gap in
 * the timeline, so it is announced with `#EXT-X-DISCONTINUITY` — the player then
 * jumps over it instead of refusing to play the whole title.
 */
export const buildGhostMediaPlaylist = (playlist, mapUri, skip) => {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3'];
  lines.push(`#EXT-X-TARGETDURATION:${Math.ceil(playlist.targetDuration || 6)}`);
  lines.push('#EXT-X-MEDIA-SEQUENCE:0');
  if (playlist.mapUri) {
    lines.push(`#EXT-X-MAP:URI="${mapUri(-1)}"`);
  }
  let lastKey = null;
  let skipped = false;
  playlist.segments.forEach((segment, index) => {
    if (skip && skip.has(index)) {
      skipped = true;
      return;
    }
    if (skipped) {
      lines.push('#EXT-X-DISCONTINUITY');
      skipped = false;
    }
    if (segment.key) {
      const key = `${segment.key.method}:${segment.key.uri}`;
      if (key !== lastKey) {
        lines.push(
          `#EXT-X-KEY:METHOD=${segment.key.method},URI="${mapUri(
            segment.key.uri,
          )}"`,
        );
        lastKey = key;
      }
    } else if (lastKey) {
      lines.push('#EXT-X-KEY:METHOD=NONE');
      lastKey = null;
    }
    lines.push(`#EXTINF:${tagDuration(segment.duration || 6)},`);
    lines.push(mapUri(index));
  });
  if (playlist.endList) {
    lines.push('#EXT-X-ENDLIST');
  }
  return lines.join('\n') + '\n';
};

/** Master playlist that only lists the qualities we cached locally. */
export const buildGhostMasterPlaylist = (variants, mapVariant) => {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3'];
  variants.forEach((variant, index) => {
    const attrs = [`BANDWIDTH=${variant.bandwidth || 0}`];
    if (variant.resolution) {
      attrs.push(`RESOLUTION=${variant.resolution}`);
    }
    lines.push(`#EXT-X-STREAM-INF:${attrs.join(',')}`);
    lines.push(mapVariant(index));
  });
  return lines.join('\n') + '\n';
};
