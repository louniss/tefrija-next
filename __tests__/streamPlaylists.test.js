import {
  absolutize,
  buildGhostMasterPlaylist,
  buildGhostMediaPlaylist,
  isMasterPlaylist,
  originOf,
  parseMasterPlaylist,
  parseMediaPlaylist,
  pickDefaultVariant,
  tokenFromUrl,
  withToken,
} from '../src/stream/playlists';

describe('absolutize', () => {
  it('resolves a sibling uri against the playlist path', () => {
    expect(absolutize('https://h.com/a/master.m3u8', 'v1.m3u8')).toBe(
      'https://h.com/a/v1.m3u8',
    );
  });

  it('resolves root-relative and absolute uri', () => {
    expect(absolutize('https://h.com/a/master.m3u8', '/x/y.ts')).toBe(
      'https://h.com/x/y.ts',
    );
    expect(absolutize('https://h.com/a/master.m3u8', 'https://c.com/z.ts')).toBe(
      'https://c.com/z.ts',
    );
  });

  it('walks up with ..', () => {
    expect(absolutize('https://h.com/a/b/master.m3u8', '../c/x.ts')).toBe(
      'https://h.com/a/c/x.ts',
    );
  });

  it('keeps protocol-relative uri on the playlist scheme', () => {
    expect(absolutize('https://h.com/a/master.m3u8', '//cdn.com/x.ts')).toBe(
      'https://cdn.com/x.ts',
    );
  });
});

describe('originOf', () => {
  it('drops path and query', () => {
    expect(originOf('http://10.0.2.2:8100/master.m3u8?token=1')).toBe(
      'http://10.0.2.2:8100',
    );
  });
});

describe('tokens', () => {
  it('reads and appends the playlist token once', () => {
    const url = 'https://h.com/pl/abc?token=jwt';
    expect(tokenFromUrl(url)).toBe('jwt');
    expect(withToken('https://h.com/pl/abc', 'jwt')).toBe(
      'https://h.com/pl/abc?token=jwt',
    );
    expect(withToken(url, 'jwt')).toBe(url);
    expect(withToken('https://h.com/x?a=1', 'jwt')).toBe(
      'https://h.com/x?a=1&token=jwt',
    );
  });
});

const master = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=400000,RESOLUTION=640x360
lo.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=1280x720
hi.m3u8
`;

const media = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:4
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:4.000000,
page-0.html
#EXTINF:4.000000,
page-1.html
#EXT-X-ENDLIST
`;

describe('master playlists', () => {
  it('detects and parses qualities, best last', () => {
    expect(isMasterPlaylist(master)).toBe(true);
    expect(isMasterPlaylist(media)).toBe(false);
    const variants = parseMasterPlaylist(master, 'https://h.com/a/master.m3u8');
    expect(variants.map(v => v.resolution)).toEqual(['640x360', '1280x720']);
    expect(variants[1].url).toBe('https://h.com/a/hi.m3u8');
    expect(pickDefaultVariant(variants).resolution).toBe('1280x720');
  });
});

describe('media playlists', () => {
  it('parses segments and endlist', () => {
    const playlist = parseMediaPlaylist(media, 'https://h.com/a/hi.m3u8');
    expect(playlist.segments.map(s => s.url)).toEqual([
      'https://h.com/a/page-0.html',
      'https://h.com/a/page-1.html',
    ]);
    expect(playlist.targetDuration).toBe(4);
    expect(playlist.endList).toBe(true);
  });

  it('rewrites chunk and quality urls to the local server', () => {
    const playlist = parseMediaPlaylist(media, 'https://h.com/a/hi.m3u8');
    const ghost = buildGhostMediaPlaylist(playlist, index =>
      index < 0 ? 'http://127.0.0.1:9000/map.ts' : `http://127.0.0.1:9000/${index}.ts`,
    );
    expect(ghost).toContain('#EXTINF:4,');
    expect(ghost).toContain('http://127.0.0.1:9000/0.ts');
    expect(ghost).toContain('http://127.0.0.1:9000/1.ts');
    expect(ghost).toContain('#EXT-X-ENDLIST');
  });

  it('builds a master playlist pointing at local qualities', () => {
    const variants = parseMasterPlaylist(master, 'https://h.com/a/master.m3u8');
    const ghost = buildGhostMasterPlaylist(variants, i => `local-${i}.m3u8`);
    expect(ghost).toContain('#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=1280x720');
    expect(ghost).toContain('local-1.m3u8');
  });
});
