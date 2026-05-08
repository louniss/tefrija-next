function parse(m3u8) {
  const lines = m3u8.split('\n');
  let playlist = [];
  let currentQuality = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#EXT-X-STREAM-INF')) {
      const resolution = line.match(/RESOLUTION=(\d+x\d+)/)[1];
      currentQuality = {
        resolution: resolution,
        uri: lines[i + 1],
      };
      playlist.push(currentQuality);
    }
  }
  return playlist;
}

export default parse;
