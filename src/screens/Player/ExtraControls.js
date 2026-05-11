import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  StyleSheet,
  useColorScheme,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  Pressable,
  ScrollView,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Caption,
  Chip,
  Dialog,
  Headline,
  IconButton,
  List,
  Modal,
  Paragraph,
  Portal,
  Text,
} from 'react-native-paper';
import {Menu, Divider} from 'react-native-paper';
import Slider from '@react-native-community/slider';

import WebView from 'react-native-webview';
import {moviedb} from '../../movieDb';
import {useNavigation} from '@react-navigation/native';
import SubtitleManager from '../../SubtitleManager';

import useMainState from '../../state/Main';
import delay from 'delay';

const {width} = Dimensions.get('window');

const subtitleManager = new SubtitleManager();

const ExtraControls = ({
  isPlaying,
  setIsPlaying,
  playerQualities,
  setUri,
  playerError,
  setSubtitleIsVisible,
  setSelectedLang,
  subtitleDelay,
  setSubtitleDelay,
  videoRef,

  duration,
  currentTime,
  setCurrentTime,
  liveCurrentTime,

  subtitleText,
  subtitleIsVisible,
  isRtl,

  subtitleNumber,
  setSubtitleNumber,

  id,
  season,
  episode,
  type,

  resizeMode,
  setResizeMode,
}) => {
  const [visible, setVisible] = useState(false);
  const [subtitleModalVisible, setSubtitleModalVisible] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const colorScheme = useColorScheme();

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  const openSubtitleModal = () => setSubtitleModalVisible(true);
  const closeSubtitleModal = () => setSubtitleModalVisible(false);

  const [adsVisible, setAdsVisible] = useState(false);
  const [canCloseAds, setCanCloseAds] = useState(false);

  const navigation = useNavigation();

  const langs = [
    {lang: 'Arabic', code: 'ara'},
    {lang: 'French', code: 'fre'},
    {lang: 'English', code: 'eng'},
  ];

  const [currentLang, setCurrentLang] = useState('Arabic');
  const [mediaTitle, setMediaTitle] = useState('');

  const [isLocked, setIsLocked] = useState(false);
  const unlockButtonAnim = useRef(new Animated.Value(0)).current;

  const state = useMainState();

  const [adUrl, setAdUrl] = useState('');

  const resizeModes = ['cover', 'contain', 'stretch', 'none'];
  const [resizeIndex, setResizeIndex] = useState(0);

  useEffect(() => {
    setTimeout(
      () =>
        setAdUrl(
          'https://www.profitablecpmrate.com/pm7jq0rt?key=696ff9fed5967bb4dcde833e5ad0ac81',
        ),
      5000,
    );
  }, []);

  const showUnlockButton = () => {
    Animated.timing(unlockButtonAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(unlockButtonAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 1000);
    });
  };

  const handleLockPress = () => {
    toggleControls();
    setIsLocked(true);
    showUnlockButton();
  };

  const handleUnlockPress = () => {
    setIsLocked(false);
    toggleControls();
  };

  useEffect(() => {
    async function fetchMediaTitle() {
      let response;
      if (type === 'movie') {
        response = await moviedb.movieInfo({id: id});
        setMediaTitle(response.title);
      } else {
        response = await moviedb.tvInfo({id: id});
        setMediaTitle(`${response.name} - Season ${season} Episode ${episode}`);
      }
    }
    fetchMediaTitle();
  }, [id, type]);

  useEffect(() => {
    console.log('duration', duration);
  }, [duration]);

  global.videoRef = videoRef;

  const formatTime = seconds => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s]
      .map(v => (v < 10 ? '0' + v : v))
      .filter((v, i) => v !== '00' || i > 0)
      .join(':');
  };

  const handleSliderChange = value => {
    videoRef.current.seek(value);
    setCurrentTime(value);
  };

  const toggleControls = () => {
    setControlsVisible(!controlsVisible);
    Animated.timing(fadeAnim, {
      toValue: controlsVisible ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const lastTap = useRef(null);

  const handleScreenPress = event => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 200;
    if (lastTap.current && now - lastTap.current < DOUBLE_PRESS_DELAY) {
      const {locationX} = event.nativeEvent;
      if (locationX < width / 3) {
        // Decrease current time by 10 seconds
        const newTime = Math.max(currentTime - 10, 0);
        videoRef.current.seek(newTime);
        setCurrentTime(newTime);
      } else if (locationX > (2 * width) / 3) {
        // Increase current time by 10 seconds
        const newTime = Math.min(currentTime + 10, duration);
        videoRef.current.seek(newTime);
        setCurrentTime(newTime);
      }
      lastTap.current = null;
    } else {
      lastTap.current = now;
      setTimeout(() => {
        if (lastTap.current === now) {
          toggleControls();
          lastTap.current = null;
        }
      }, DOUBLE_PRESS_DELAY);
    }
  };

  return (
    <View style={{flex: 1}}>
      <TouchableWithoutFeedback
        onPress={event => {
          if (isLocked) {
            showUnlockButton();
          } else {
            handleScreenPress(event);
          }
        }}>
        <View style={styles.container}>
          <Animated.View
            style={[
              styles.unlockButtonContainer,
              {opacity: unlockButtonAnim, display: isLocked ? 'flex' : 'none'},
            ]}>
            <Button
              icon="lock-open"
              onPress={handleUnlockPress}
              style={{width: 100}}
              mode="contained-tonal">
              Unlock
            </Button>
          </Animated.View>
          <Animated.View
            style={[
              styles.extraControlsContainer,
              {opacity: fadeAnim, display: controlsVisible ? 'flex' : 'none'},
            ]}>
            {playerError && (
              <View style={styles.errorContainer}>
                <Headline style={styles.errorText}>
                  error, change quality
                </Headline>
              </View>
            )}
            <View style={styles.appBar}>
              <IconButton
                icon={'arrow-left'}
                size={30}
                onPress={() => {
                  navigation.goBack();
                }}
              />
              <Text style={{color: 'white', fontSize: 20}}>{mediaTitle}</Text>
            </View>
            <View style={styles.extraControls}>
              <View style={styles.controlButtons}>
                <IconButton
                  size={30}
                  icon="rewind-10"
                  mode="contained"
                  onPress={() => {
                    videoRef.current.seek(liveCurrentTime - 10);
                    setCurrentTime(liveCurrentTime - 10);
                  }}
                />
                <IconButton
                  size={40}
                  icon={isPlaying ? 'pause' : 'play'}
                  mode="contained"
                  onPress={() => {
                    if (isPlaying) {
                      setAdsVisible(true);
                      setCanCloseAds(false);

                      setTimeout(() => {
                        setCanCloseAds(true);
                      }, 6000);
                    } else {
                      setAdsVisible(false);
                      setCanCloseAds(true);
                    }
                    setIsPlaying(!isPlaying);
                  }}
                />
                <IconButton
                  size={30}
                  icon="fast-forward-10"
                  mode="contained"
                  onPress={() => {
                    videoRef.current.seek(liveCurrentTime + 10);
                    setCurrentTime(liveCurrentTime + 10);
                  }}
                />
              </View>
              <View style={styles.horizontalLayout}>
                <IconButton
                  icon="minus"
                  mode="contained"
                  onPress={() => setSubtitleDelay(subtitleDelay + 1)}
                />
                <IconButton
                  icon="plus"
                  mode="contained"
                  onPress={() => {
                    setSubtitleDelay(subtitleDelay - 1);
                  }}
                />
              </View>
            </View>
            <View style={styles.bottomControls}>
              <View style={styles.sliderContainer}>
                <Text style={styles.timestamp}>
                  {formatTime(liveCurrentTime)}
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={duration}
                  value={liveCurrentTime}
                  onValueChange={handleSliderChange}
                />
                <Text style={styles.timestamp}>{formatTime(duration)}</Text>
              </View>
              <View style={styles.bottomButtons}>
                <Button icon="subtitles" onPress={openSubtitleModal}>
                  Subtitles
                </Button>
                <Button icon="lock" onPress={handleLockPress}>
                  Lock
                </Button>
                <Menu
                  visible={visible}
                  onDismiss={closeMenu}
                  anchor={
                    <Button icon="quality-high" onPress={openMenu}>
                      Quality
                    </Button>
                  }>
                  {playerQualities.map((quality, index) => (
                    <Menu.Item
                      key={index}
                      onPress={() => {
                        setUri(quality.uri);
                        closeMenu();
                      }}
                      title={quality.resolution}
                    />
                  ))}
                </Menu>

                {season && episode && (
                  <Button
                    icon={'arrow-right'}
                    onPress={async () => {
                      const s = await moviedb.seasonInfo({
                        id: id,
                        season: season,
                      });

                      const info = await moviedb.tvInfo({
                        id: id,
                        append_to_response: 'seasons',
                      });

                      if (episode < s.episodes.length) {
                        const externalIds = await moviedb.episodeExternalIds({
                          id: id,
                          season_number: s.season_number,
                          episode_number: episode + 1,
                        });

                        navigation.replace('VideoPlayer', {
                          id: id,
                          type: 'tv',
                          season: s.season_number,
                          episode: episode + 1,
                          imdbId: externalIds.imdb_id,
                        });
                        state.addToContinueWatching({
                          id: info.id,
                          title: info.name,
                          image: `https://image.tmdb.org/t/p/w500/${info.poster_path}`,
                          type: 'tv',
                          season: s.season_number,
                          episode: episode + 1,
                          year: info.first_air_date?.split('-')[0],
                        });
                      } else {
                        const nextSeason = await moviedb.seasonInfo({
                          id: id,
                          season: s.season_number + 1,
                        });

                        if (nextSeason) {
                          const externalIds = await moviedb.episodeExternalIds({
                            id: id,
                            season_number: nextSeason.season_number,
                            episode_number: 1,
                          });

                          navigation.replace('VideoPlayer', {
                            id: id,
                            type: 'tv',
                            season: nextSeason.season_number,
                            episode: 1,
                            imdbId: externalIds.imdb_id,
                          });
                          state.addToContinueWatching({
                            id: info.id,
                            title: info.name,
                            image: `https://image.tmdb.org/t/p/w500/${info.poster_path}`,
                            type: 'tv',
                            season: nextSeason.season_number,
                            episode: 1,
                            year: info.first_air_date?.split('-')[0],
                          });
                        }
                      }
                    }}>
                    Next Episode
                  </Button>
                )}

                <Button
                  icon="aspect-ratio"
                  onPress={() => {
                    if (resizeIndex === 3) {
                      setResizeIndex(0);
                    } else {
                      setResizeIndex(resizeIndex + 1);
                    }
                    setResizeMode(resizeModes[resizeIndex]);
                  }}
                />
              </View>
            </View>
          </Animated.View>
          <Subtitle
            {...{subtitleText, subtitleIsVisible, isRtl, controlsVisible}}
          />
        </View>
      </TouchableWithoutFeedback>
      {adUrl && (
        <View
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: -1000,
            left: -1000,
          }}>
          <WebView
            source={{
              uri: adUrl,
            }}
            style={{width: '100%', height: '100%'}}
          />
        </View>
      )}
      <Portal>
        <Dialog
          theme={{
            dark: colorScheme === 'dark',
          }}
          visible={subtitleModalVisible}
          dismissableBackButton={true}
          onDismiss={() => {
            closeSubtitleModal();
          }}>
          <IconButton
            icon="close"
            onPress={closeSubtitleModal}
            style={{
              position: 'absolute',
              right: 0,
              top: -10,
            }}
          />
          <Dialog.Content>
            <View style={{flexDirection: 'row', padding: 10}}>
              <View style={{flex: 1, paddingRight: 8}}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                  <Headline style={{marginRight: 12}}>Subtitles</Headline>
                  <Button
                    mode="text"
                    compact={true}
                    onPress={() => setSubtitleIsVisible(!subtitleIsVisible)}
                    icon={subtitleIsVisible ? 'eye-off' : 'eye'}
                    style={{marginRight: 12}}
                  >
                    {subtitleIsVisible ? 'Hide Subtitle' : 'Show Subtitle'}
                  </Button>
                  <View style={{flex: 1, alignItems: 'flex-end'}}>
                    <Chip mode="outlined" disabled={true}>
                      {currentLang} {subtitleNumber + 1}
                    </Chip>
                  </View>
                </View>
                <Divider style={{marginVertical: 8}} />
                <ScrollView style={{height: 200}}>
                  {langs.map(lang => (
                    <List.Item
                      key={lang.code}
                      onPress={() => {
                        setSelectedLang(lang.code);
                        setCurrentLang(lang.lang);
                      }}
                      title={lang.lang}
                    />
                  ))}
                  <Divider />
                  {subtitleManager.langs.map((lang, idx) => (
                    <List.Item key={lang.title || idx} onPress={() => {}} title={lang.title} />
                  ))}
                </ScrollView>
              </View>
              <View style={{flex: 1}}>
                <ScrollView style={{height: 200}}>
                  {new Array(15).fill(0).map((n, index) => (
                    <List.Item
                      key={index}
                      onPress={() => {
                        setSubtitleNumber(index);
                      }}
                      title={`${currentLang} ${index + 1}`}
                    />
                  ))}
                </ScrollView>
              </View>
            </View>
          </Dialog.Content>
        </Dialog>
      </Portal>
    </View>
  );
};

const Subtitle = ({
  subtitleText,
  subtitleIsVisible,
  isRtl,
  controlsVisible,
}) => (
  <View
    pointerEvents="none"
    style={{
      ...styles.subtitleContainer,
      zIndex: -100,
    }}>
    <Headline
      pointerEvents="none"
      style={{
        ...styles.subtitleText,
        textAlign: isRtl ? 'right' : 'left',
        bottom: controlsVisible ? 70 : 20,
      }}>
      {subtitleIsVisible ? subtitleText?.trim() : ''}
    </Headline>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoPlayer: {
    flex: 10,
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
    width: 300,
    alignSelf: 'center',
  },
  modalContainerDark: {
    backgroundColor: '#333',
    padding: 20,
    margin: 20,
    borderRadius: 10,
    width: 300,
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
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 15,
  },
  slider: {
    flex: 1,
  },
  timestamp: {
    color: 'white',
    marginLeft: 10,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 10,
  },
  appBar: {
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
  },

  unlockButtonContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
});

export default ExtraControls;
