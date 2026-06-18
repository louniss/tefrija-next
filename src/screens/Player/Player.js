import React, {useRef, useState} from 'react';
import Video from 'react-native-video';
import {Dimensions, StyleSheet, TouchableOpacity, View} from 'react-native';
import SystemNavigationBar from 'react-native-system-navigation-bar';

import ExtraControls from './ExtraControls';

const Player = ({
  uri,
  state,
  id,
  type,
  season,
  episode,
  setCurrentTime,
  setSubtitleText,
  currentTime,
  isPlaying,
  setPlayerError,
  subtitleReader,
  subtitleDelay,

  setIsPlaying,
  playerQualities,
  setUri,
  playerError,
  setSubtitleIsVisible,
  setSelectedLang,
  setSubtitleDelay,

  subtitleText,
  subtitleIsVisible,
  isRtl,

  subtitleNumber,
  setSubtitleNumber,
}) => {
  const videoRef = useRef(null);

  const [duration, setDuration] = useState(0);
  const [liveCurrentTime, setLiveCurrentTime] = useState(0);

  const [resizeMode, setResizeMode] = useState('cover');

  SystemNavigationBar.stickyImmersive();

  return (
    <>
      <Video
        volume={1}
        ref={videoRef}
        paused={!isPlaying}
        controls={false}
        resizeMode={resizeMode}
        onError={err => {
          console.log('Player Error', err);
          setPlayerError(true);
        }}
        onLoad={data => {
          setPlayerError(false);
          setDuration(data.duration);

          const time = state.getById(id).time;
          if (time) {
            if (type === 'tv') {
              if (time[season] && time[season][episode]) {
                videoRef.current.seek(time[season][episode]);
              }
            } else {
              videoRef.current.seek(time);
            }
          }
        }}
        onProgress={data => {
          setLiveCurrentTime(data.currentTime);
          if (Math.abs(data.currentTime - currentTime) > 5) {
            setCurrentTime(data.currentTime);
            state.updateTime(id, data.currentTime);
          }

          const text = subtitleReader.getTextAtTimestamp(
            data.currentTime,
            subtitleDelay,
          );
          setSubtitleText(text);
        }}
        style={styles.videoPlayer}
        source={{
          uri: uri,
          headers: {
            ':authority': 'horologyhollow.site',
            origin: 'https://cloudorchestranova.com',
            referer: 'https://cloudorchestranova.com/',
            'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'cross-site',
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
          },
        }}
      />
      <ExtraControls
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        playerQualities={playerQualities}
        setUri={setUri}
        playerError={playerError}
        setSubtitleIsVisible={setSubtitleIsVisible}
        setSelectedLang={setSelectedLang}
        subtitleDelay={subtitleDelay}
        setSubtitleDelay={setSubtitleDelay}
        videoRef={videoRef}
        duration={duration}
        currentTime={currentTime}
        setCurrentTime={setCurrentTime}
        liveCurrentTime={liveCurrentTime}
        //subs
        subtitleText={subtitleText}
        subtitleIsVisible={subtitleIsVisible}
        isRtl={isRtl}
        subtitleNumber={subtitleNumber}
        setSubtitleNumber={setSubtitleNumber}
        id={id}
        season={season}
        episode={episode}
        type={type}
        resizeMode={resizeMode}
        setResizeMode={setResizeMode}
      />
    </>
  );
};

const styles = StyleSheet.create({
  touchableOpacity: {
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height,
  },
  container: {
    flex: 1,
  },
  videoPlayer: {
    //width: Dimensions.get('screen').width,
    //height: Dimensions.get('screen').height,
    width: '100%',
    height: '100%',
    position: 'absolute',
    backgroundColor: 'black',
  },
  horizontalLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  errorContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: 'black',
  },

  errorText: {
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 5,
  },

  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 10,
    width: 350,
    alignSelf: 'center',
  },

  extraControlsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  extraControls: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitleContainer: {
    position: 'absolute',
    left: 0,
    bottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  subtitleText: {
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 5,
  },
});

export default Player;
