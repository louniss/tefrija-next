/**
 * @format
 */

import {loadSubtitleTrack} from '../src/stream/subtitles';

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
