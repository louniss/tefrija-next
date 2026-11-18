import {useNavigation} from '@react-navigation/native';
import React, {useRef, useState, useEffect} from 'react';
import SystemNavigationBar from 'react-native-system-navigation-bar';

import {View, StyleSheet} from 'react-native';

import useMainState from '../../state/Main';
import {FetchVideoComponent} from '../../components/FetchVideoComponent';
import SubtitleReader from '../../SubtitleReader';
import SubtitleManager from '../../SubtitleManager';
import {ensureStreamServer} from '../../stream/server';
import {
  chunksComplete,
  loadRecord,
  localVariantUrl,
  prepareStream,
} from '../../stream/manager';
import useStreamStore, {streamKey} from '../../stream/store';
import {invalidateFlow} from '../../components/resolveFlow';

import Player from './Player';

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
  const [resolverAttempt, setResolverAttempt] = useState(0);

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
      if (!imdbId) {
        return;
      }
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

  const mediaKey = streamKey({type, id, season, episode});
  // Dev affordance: play a stream straight from its master url, bypassing the
  // resolver, so the local server can be exercised on its own.
  const injectedStream = __DEV__ ? route.params.streamUrl : null;

  useEffect(() => {
    if (!injectedStream) {
      return;
    }
    prepareStream({
      type,
      id,
      season,
      episode,
      masterUrl: injectedStream,
      title: route.params.title,
      poster: '',
      year: '',
    })
      .then(playRecord)
      .catch(e => {
        console.log('injected stream failed', e.message);
        setPlayerError(e.message || true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injectedStream]);

  // A fully cached item plays from disk: no resolver, no network.
  const [offlineRecord, setOfflineRecord] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored =
        useStreamStore.getState().streams[mediaKey] ||
        (await loadRecord(mediaKey));
      if (cancelled) {
        return;
      }
      if (!stored) {
        setOfflineRecord(null);
        return;
      }
      const variant = stored.downloadedVariant ?? stored.defaultVariant;
      const complete = await chunksComplete(stored, variant);
      if (!cancelled) {
        setOfflineRecord(complete ? stored : null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mediaKey]);

  const playRecord = async record => {
    const port = await ensureStreamServer();
    const variant = record.downloadedVariant ?? record.defaultVariant;
    console.log(
      'stream ready',
      record.key,
      'quality',
      record.variants[variant].resolution || 'single',
      'from',
      record.downloadedVariant != null ? 'disk' : 'cache',
    );
    setPlayerQualities(
      record.variants
        .map((quality, index) => ({
          resolution: quality.resolution || 'auto',
          uri: localVariantUrl(port, record.key, index),
          bandwidth: quality.bandwidth,
        }))
        .reverse(),
    );
    setIsDone(true);
    setUri(localVariantUrl(port, record.key, variant));
  };

  useEffect(() => {
    if (offlineRecord) {
      playRecord(offlineRecord).catch(e => {
        console.log('offline playback failed', e);
        setOfflineRecord(null);
      });
    }
    // Only when the offline record for this media changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offlineRecord]);

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

      {!offlineRecord && !injectedStream && (
        <FetchVideoComponent
          key={`resolver-${resolverAttempt}`}
          id={id}
          type={type}
          season={season}
          episode={episode}
          onDone={async resolved => {
            if (alreadyOnDone) {
              return;
            }
            setAlreadyOnDone(true);

            console.log('resolved stream url: ', resolved.url);
            try {
              const watched = state.getById(id);
              const record = await prepareStream({
                type,
                id,
                season,
                episode,
                masterUrl: resolved.url,
                playerUrl: resolved.playerUrl,
                docUrl: resolved.docUrl,
                docOrigin: resolved.docOrigin,
                title: watched ? watched.title : '',
                poster: watched ? watched.image : '',
                year: watched ? watched.year : '',
              });
              await playRecord(record);
            } catch (e) {
              console.log('stream preparation failed', e);
              // A url we cannot even read usually means the flow is stale, so
              // ask for a newer one and give the resolver one more go.
              if (resolverAttempt < 1) {
                await invalidateFlow();
                setAlreadyOnDone(false);
                setResolverAttempt(n => n + 1);
                return;
              }
              setPlayerError(e.message || true);
            }
          }}
          onError={err => {
            console.log('err', err);
            setPlayerError(err || true);
          }}
        />
      )}
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
