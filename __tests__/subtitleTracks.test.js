/**
 * @format
 */

import {loadSubtitleTrack, resolveImdbId} from '../src/stream/subtitles';

const sub = {utf8Data: 'remote text', arabicData: 'remote arabic'};

const createManager = ({disk = null, links = [], text = sub} = {}) => ({
  getLocalSubtitleForMedia: jest.fn(async () => disk),
  fetchSubtitleLinks: jest.fn(async () => links),
  subtitleUrlToText: jest.fn(async () => text),
  saveLocalSubtitleForMedia: jest.fn(async () => {}),
});

describe('loadSubtitleTrack', () => {
  it('plays a track from disk without touching the network', async () => {
    const manager = createManager({disk: {utf8Data: 'from disk'}});

    const result = await loadSubtitleTrack({
      manager,
      imdbId: 'tt0111161',
      lang: 'ara',
      track: 0,
    });

    expect(result).toMatchObject({text: 'from disk', fromDisk: true});
    expect(manager.getLocalSubtitleForMedia).toHaveBeenCalledWith(
      '0111161',
      'ara',
      0,
    );
    expect(manager.fetchSubtitleLinks).not.toHaveBeenCalled();
    expect(manager.saveLocalSubtitleForMedia).not.toHaveBeenCalled();
  });

  it('downloads track 1 and stores it under track 1', async () => {
    const manager = createManager({links: ['first', 'second']});

    const result = await loadSubtitleTrack({
      manager,
      imdbId: 'tt0111161',
      lang: 'ara',
      track: 0,
    });

    expect(result.text).toBe('remote text');
    expect(manager.subtitleUrlToText).toHaveBeenCalledWith('first');
    expect(manager.saveLocalSubtitleForMedia).toHaveBeenCalledWith(
      '0111161',
      'ara',
      0,
      sub,
    );
  });

  it('stores a second track under its own number so it can be read later', async () => {
    const manager = createManager({links: ['first', 'second', 'third']});

    const result = await loadSubtitleTrack({
      manager,
      imdbId: 'tt0111161',
      lang: 'ara',
      track: 1,
    });

    expect(result).toMatchObject({text: 'remote text', fromDisk: false});
    expect(manager.subtitleUrlToText).toHaveBeenCalledWith('second');
    expect(manager.saveLocalSubtitleForMedia).toHaveBeenCalledWith(
      '0111161',
      'ara',
      1,
      sub,
    );
  });

  it('falls back to the last available track but caches the picked number', async () => {
    const manager = createManager({links: ['first', 'second']});

    const result = await loadSubtitleTrack({
      manager,
      imdbId: 'tt0111161',
      lang: 'ara',
      track: 4,
    });

    expect(result).toMatchObject({text: 'remote text', source: 1});
    expect(manager.saveLocalSubtitleForMedia).toHaveBeenCalledWith(
      '0111161',
      'ara',
      4,
      sub,
    );
  });

  it('returns nothing when the release has no subtitles', async () => {
    const manager = createManager({links: []});

    const result = await loadSubtitleTrack({
      manager,
      imdbId: 'tt0111161',
      lang: 'ara',
      track: 0,
    });

    expect(result.text).toBe('');
    expect(manager.saveLocalSubtitleForMedia).not.toHaveBeenCalled();
  });

  it('keeps a non-imdb id as its own cache key', async () => {
    const manager = createManager({links: ['first']});

    await loadSubtitleTrack({
      manager,
      imdbId: '12345',
      lang: 'ara',
      track: 0,
    });

    expect(manager.getLocalSubtitleForMedia).toHaveBeenCalledWith(
      '12345',
      'ara',
      0,
    );
  });
});

describe('resolveImdbId', () => {
  it('looks the imdb id up for a movie', async () => {
    const db = {movieExternalIds: jest.fn(async () => ({imdb_id: 'tt42'}))};

    await expect(resolveImdbId({db, type: 'movie', id: 42})).resolves.toBe(
      'tt42',
    );
    expect(db.movieExternalIds).toHaveBeenCalledWith({id: 42});
  });

  it('uses the episode ids for a series episode', async () => {
    const db = {episodeExternalIds: jest.fn(async () => ({imdb_id: 'tt7'}))};

    await expect(
      resolveImdbId({db, type: 'tv', id: 7, season: 1, episode: 3}),
    ).resolves.toBe('tt7');
    expect(db.episodeExternalIds).toHaveBeenCalledWith({
      id: 7,
      season_number: 1,
      episode_number: 3,
    });
  });

  it('falls back to the show ids when there is no episode', async () => {
    const db = {tvExternalIds: jest.fn(async () => ({imdb_id: 'tt9'}))};

    await expect(resolveImdbId({db, type: 'tv', id: 9})).resolves.toBe('tt9');
    expect(db.tvExternalIds).toHaveBeenCalledWith({id: 9});
  });

  it('returns null when the lookup fails', async () => {
    const db = {
      movieExternalIds: jest.fn(async () => {
        throw new Error('offline');
      }),
    };

    await expect(resolveImdbId({db, type: 'movie', id: 1})).resolves.toBeNull();
  });
});
