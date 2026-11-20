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
    return {text: localText, fromDisk: true, track};
  }

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

  return {text, fromDisk: false, track, source};
};
