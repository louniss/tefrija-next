import {useNavigation} from '@react-navigation/native';
import React, {useRef, useState, useEffect} from 'react';
import SystemNavigationBar from 'react-native-system-navigation-bar';

import {View, StyleSheet} from 'react-native';

import useMainState from '../../state/Main';
import {FetchVideoComponent} from '../../components/FetchVideoComponent';
import SubtitleReader from '../../SubtitleReader';
import SubtitleManager from '../../SubtitleManager';

import Player from './Player';
import parse from './parse';

const subtitleManager = new SubtitleManager();

const VideoPlayerScreen = ({route}) => {
  SystemNavigationBar.stickyImmersive();
  const state = useMainState();

  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [subtitleDelay, setSubtitleDelay] = useState(0);
  const [uri, setUri] = useState('');
  const [isDone, setIsDone] = useState(false);

  const [extraControls, setExtraControls] = useState(true);
  const [playerQualities, setPlayerQualities] = useState([]);

  const [alreadyOnDone, setAlreadyOnDone] = useState(false);

  const [subtitleText, setSubtitleText] = useState('');

  const [playerError, setPlayerError] = useState(false);

  const [subtitleIsVisible, setSubtitleIsVisible] = useState(true);

  const [selectedLang, setSelectedLang] = useState('ara');
  const [subtitleReader, setSubtitleReader] = useState(new SubtitleReader(''));

  const [subtitleNumber, setSubtitleNumber] = useState(0);

  const [id, setId] = useState(route.params.id);
  const [type, setType] = useState(route.params.type);
  const [imdbId, setImdbId] = useState(route.params.imdbId);
  const [season, setSeason] = useState(route.params.season);
  const [episode, setEpisode] = useState(route.params.episode);

  useEffect(() => {
    async function fetchSubtitle() {
      const id = imdbId.split('tt')[1];
      const subs = await subtitleManager.fetchSubtitleLinks(id, selectedLang);

      let num = subtitleNumber;

      if (subs.length <= subtitleNumber) {
        num = subs.length - 1;
      }

      if (subs.length > 0) {
        const subText = await subtitleManager.subtitleUrlToText(subs[num]);

        if (subText.utf8Data) {
          setSubtitleReader(new SubtitleReader(subText.utf8Data));
        } else if (subText.arabicData) {
          setSubtitleReader(new SubtitleReader(subText.arabicData));
        }
      }
    }
    fetchSubtitle();
  }, [selectedLang, imdbId, id, subtitleNumber]);

  useEffect(() => {
    setId(route.params.id);
    setType(route.params.type);
    setImdbId(route.params.imdbId);
    setSeason(route.params.season);
    setEpisode(route.params.episode);

    console.log(
      'setting season and episode: ',
      route.params.season,
      route.params.episode,
    );
  }, [route]);

  const navigation = useNavigation();
  navigation.setOptions({
    orientation: 'landscape',
  });

  return (
    <View style={styles.container}>
      <Player
        style={{flex: 1}}
        uri={uri}
        state={state}
        id={id}
        type={type}
        season={season}
        episode={episode}
        setCurrentTime={setCurrentTime}
        setSubtitleText={setSubtitleText}
        navigation={navigation}
        setExtraControls={setExtraControls}
        currentTime={currentTime}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        setPlayerError={setPlayerError}
        playerError={playerError}
        subtitleReader={subtitleReader}
        subtitleDelay={subtitleDelay}
        // for extra controls
        playerQualities={playerQualities}
        setUri={setUri}
        setSubtitleIsVisible={setSubtitleIsVisible}
        setSelectedLang={setSelectedLang}
        setSubtitleDelay={setSubtitleDelay}
        //sub
        subtitleText={subtitleText}
        subtitleIsVisible={subtitleIsVisible}
        isRtl={selectedLang === 'ara'}
        subtitleNumber={subtitleNumber}
        setSubtitleNumber={setSubtitleNumber}
      />

      <FetchVideoComponent
        id={id}
        type={type}
        season={season}
        episode={episode}
        onDone={async url => {
          if (alreadyOnDone) {
            return;
          }
          setAlreadyOnDone(true);

          console.log('ondone playing this url: ', url);
          setUri(url);
          setIsDone(true);

          const response = await fetch(url, {
            method: 'GET',
          });

          const m3u8 = await response.text();

          try {
            console.log('parsing m3u8 content: ', m3u8);

            let playlist = parse(m3u8);

            const domain = url.match(/^(https?:\/\/[^\/]+)/)[1];

            for (let item of playlist) {
              item.uri = domain + item.uri;
            }
            console.log('parsed playlist: ', playlist);

            setPlayerQualities(playlist);
          } catch (e) {
            console.log('error parsing qualities: ', e);
          }
        }}
        onError={err => {
          console.log('err', err);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoPlayer: {
    flex: 10,
  },

  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 10,
    width: 350,
    alignSelf: 'center',
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

export default VideoPlayerScreen;
