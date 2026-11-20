/* Most entry points (home rows, downloads) only know the TMDB id, while
 * subtitles are looked up by imdb id. */
export const resolveImdbId = async ({db, type, id, season, episode}) => {
  try {
    const res =
      type === 'tv' && season != null && episode != null
        ? await db.episodeExternalIds({
            id,
            season_number: season,
            episode_number: episode,
          })
        : type === 'tv'
        ? await db.tvExternalIds({id})
        : await db.movieExternalIds({id});
    return res?.imdb_id ?? null;
  } catch (e) {
    console.log('could not resolve imdb id for', type, id, e.message);
    return null;
  }
};

/* Resolve one subtitle track for the player. A track that was used before is
 * read from disk; otherwise it is fetched once and stored under the same track
 * number, so switching back to it later never touches the subtitle service. */
export const loadSubtitleTrack = async ({manager, imdbId, lang, track}) => {
  // The player may hand over ids that are not imdb ones; keep them as they are
  // so two different media never share the same cache file.
  const rawId = String(imdbId);
  const id = rawId.split('tt')[1] ?? rawId;

  const local = await manager.getLocalSubtitleForMedia(id, lang, track);
  const localText = local?.utf8Data || local?.arabicData || '';
  if (localText) {
    console.log('subtitle track', track + 1, 'from disk', id, lang);
    return {text: localText, fromDisk: true, track};
  }
  console.log('subtitle track', track + 1, 'not on disk', id, lang);

  const links = await manager.fetchSubtitleLinks(id, lang);
  if (links.length === 0) {
    return {text: '', fromDisk: false, track};
  }

  // The panel offers more tracks than some releases have: play the last one
  // instead of showing nothing.
  const source = Math.min(track, links.length - 1);
  const sub = await manager.subtitleUrlToText(links[source]);
  const text = sub?.utf8Data || sub?.arabicData || '';
  if (!text) {
    return {text: '', fromDisk: false, track};
  }

  // Stored under the track the viewer picked, so picking it again is a disk hit
  // even when the text came from a fallback.
  await manager.saveLocalSubtitleForMedia(id, lang, track, sub);

  console.log('subtitle track', track + 1, 'downloaded', id, lang);

  return {text, fromDisk: false, track, source};
};
