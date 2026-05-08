class SubtitleReader {
  constructor(subtitleStr) {
    this.subtitleStr = subtitleStr;
    this.subtitles = this.parseSubtitles(subtitleStr);
  }

  parseSubtitles(subtitleStr) {
    const lines = subtitleStr.trim().split('\n');
    const subtitles = [];

    let currentSubtitle = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === '') {
        // Empty line indicates the end of a subtitle
        if (currentSubtitle) {
          subtitles.push(currentSubtitle);
          currentSubtitle = null;
        }
      } else if (!currentSubtitle) {
        // Start of a new subtitle
        const id = parseInt(line, 10);
        currentSubtitle = {
          id,
          startTime: null,
          endTime: null,
          text: '',
        };
      } else if (!currentSubtitle.startTime) {
        // Start time of the subtitle
        const [startTime, endTime] = line.split(' --> ');
        currentSubtitle.startTime = startTime;
        currentSubtitle.endTime = endTime;
      } else {
        // Text of the subtitle
        currentSubtitle.text += line + '\n';
      }
    }

    if (currentSubtitle) {
      // Add the last subtitle if it exists
      subtitles.push(currentSubtitle);
    }

    return subtitles;
  }

  getTextAtTimestamp(timestamp, delay = 0) {
    for (let i = 0; i < this.subtitles.length; i++) {
      const subtitle = this.subtitles[i];
      const startTime = this.convertTimestampToSeconds(
        subtitle.startTime,
        delay,
      );
      const endTime = this.convertTimestampToSeconds(subtitle.endTime, delay);
      if (timestamp >= startTime && timestamp < endTime) {
        return subtitle.text;
      }
    }
    return null; // Return null if no matching subtitle is found
  }

  convertTimestampToSeconds(timestamp, delay = 0) {
    if (!timestamp) {
      return 0;
    }
    const [hours, minutes, secondsWithMilliseconds] = timestamp.split(':');
    const [seconds, milliseconds] = secondsWithMilliseconds.split(',');
    const [hoursNum, minutesNum, secondsNum, millisecondsNum] = [
      Number(hours),
      Number(minutes),
      Number(seconds),
      Number(milliseconds),
    ];
    return (
      hoursNum * 3600 +
      minutesNum * 60 +
      secondsNum +
      millisecondsNum / 1000 +
      delay
    );
  }
}

export default SubtitleReader;
