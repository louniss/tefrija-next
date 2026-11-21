import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  StyleSheet,
  useColorScheme,
  Animated,
  useWindowDimensions,
  Pressable,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  IconButton,
  Text,
  Portal,
  Divider,
  Icon,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import WebView from 'react-native-webview';
import {moviedb} from '../../movieDb';
import {useNavigation} from '@react-navigation/native';
import SubtitleManager from '../../SubtitleManager';
import useMainState from '../../state/Main';
import useResponsive from '../../utils/useResponsive';
import {SafeAreaInsetsContext} from 'react-native-safe-area-context';

const subtitleManager = new SubtitleManager();

const ExtraControls = ({
  isPlaying,
  setIsPlaying,
  playerQualities = [],
  setUri,
  playerError,
  setSubtitleIsVisible,
  setSelectedLang,
  subtitleDelay = 0,
  setSubtitleDelay,
  videoRef,

  duration = 0,
  currentTime = 0,
  setCurrentTime,
  liveCurrentTime = 0,

  subtitleText,
  subtitleIsVisible,
  isRtl,

  subtitleNumber = 0,
  setSubtitleNumber,

  id,
  season,
  episode,
  type,

  resizeMode,
  setResizeMode,
  volume = 1,
  setVolume,
  playbackRate = 1.0,
  setPlaybackRate,
}) => {
  const {width, height} = useWindowDimensions();
  const {isTablet} = useResponsive();
  const navigation = useNavigation();
  const state = useMainState();
  const colorScheme = useColorScheme();
  const insets = React.useContext(SafeAreaInsetsContext) || {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  };

  const [controlsVisible, setControlsVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  /* Any interaction restarts the auto-hide countdown; the tick is also what
   * keeps the timer from being recreated on every unrelated render. */
  const [interactionTick, setInteractionTick] = useState(0);

  // Modals / Panels
  const [showAudioSubModal, setShowAudioSubModal] = useState(false);
  const [showEpisodesPanel, setShowEpisodesPanel] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [seasonDropdownVisible, setSeasonDropdownVisible] = useState(false);

  // TV data
  const [mediaTitle, setMediaTitle] = useState('');
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [totalSeasons, setTotalSeasons] = useState(1);
  const [selectedSeason, setSelectedSeason] = useState(season || 1);

  useEffect(() => {
    if (season) {
      setSelectedSeason(season);
    }
  }, [season]);

  // Lock state
  const [isLocked, setIsLocked] = useState(false);
  const unlockButtonAnim = useRef(new Animated.Value(0)).current;

  // Ads
  const [adUrl, setAdUrl] = useState('');

  // Resize mode
  const resizeModes = ['cover', 'contain', 'stretch'];
  const [resizeIndex, setResizeIndex] = useState(0);

  // Subtitle langs
  const langs = [
    {lang: 'Arabic', code: 'ara'},
    {lang: 'English', code: 'eng'},
    {lang: 'French', code: 'fre'},
  ];
  const [currentLang, setCurrentLang] = useState('Arabic');

  // Speeds
  const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];

  useEffect(() => {
    setTimeout(
      () =>
        setAdUrl(
          'https://www.profitablecpmrate.com/pm7jq0rt?key=696ff9fed5967bb4dcde833e5ad0ac81',
        ),
      5000,
    );
  }, []);

  // Fetch Media and Episode title
  useEffect(() => {
    async function fetchInfo() {
      try {
        if (type === 'movie') {
          const res = await moviedb.movieInfo({id});
          setMediaTitle(res.title || '');
        } else {
          const res = await moviedb.tvInfo({id});
          setMediaTitle(res.name || '');
          setTotalSeasons(res.number_of_seasons || res.seasons?.length || 1);

          if (season && episode) {
            const ep = await moviedb.episodeInfo({
              id,
              season_number: season,
              episode_number: episode,
            });
            setEpisodeTitle(ep.name || '');
          }
        }
      } catch (e) {
        console.warn('fetchInfo error in player', e);
      }
    }
    fetchInfo();
  }, [id, type, season, episode]);

  // Fetch season episodes for episodes panel
  useEffect(() => {
    if (type === 'tv' && id && selectedSeason) {
      moviedb
        .seasonInfo({
          id,
          season_number: selectedSeason,
          append_to_response: 'episodes',
        })
        .then(res => {
          setSeasonEpisodes(res.episodes || []);
        })
        .catch(() => setSeasonEpisodes([]));
    }
  }, [id, selectedSeason, type]);

  useEffect(() => {
    if (season) setSelectedSeason(season);
  }, [season]);

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
      }, 1500);
    });
  };

  const handleLockPress = () => {
    console.log('HANDLE LOCK PRESS TRIGGERED');
    setControlsVisible(false);
    Animated.timing(fadeAnim, {toValue: 0, duration: 250, useNativeDriver: true}).start();
    setIsLocked(true);
    showUnlockButton();
  };

  const handleUnlockPress = () => {
    setIsLocked(false);
    setControlsVisible(true);
    Animated.timing(fadeAnim, {toValue: 1, duration: 250, useNativeDriver: true}).start();
  };

  const formatTime = seconds => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSliderChange = value => {
    if (videoRef?.current) {
      videoRef.current.seek(value);
      setCurrentTime(value);
    }
  };

  const setControls = nextState => {
    setControlsVisible(nextState);
    setInteractionTick(tick => tick + 1);
    Animated.timing(fadeAnim, {
      toValue: nextState ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const toggleControls = () => {
    if (showAudioSubModal || showEpisodesPanel || showSpeedMenu) {
      setShowAudioSubModal(false);
      setShowEpisodesPanel(false);
      setShowSpeedMenu(false);
      return;
    }
    setControls(!controlsVisible);
  };

  /* Controls are transient while playback runs: they fade out on their own, and
   * a tap anywhere on the picture hides them immediately. They stay put while
   * paused, while locked, and while a panel is open. */
  const AUTO_HIDE_MS = 4000;
  useEffect(() => {
    if (
      !controlsVisible ||
      !isPlaying ||
      isLocked ||
      showAudioSubModal ||
      showEpisodesPanel ||
      showSpeedMenu
    ) {
      return undefined;
    }
    const timer = setTimeout(
      () => setControls(false),
      AUTO_HIDE_MS,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    controlsVisible,
    isPlaying,
    isLocked,
    showAudioSubModal,
    showEpisodesPanel,
    showSpeedMenu,
    interactionTick,
  ]);

  const lastTap = useRef(null);

  const handleScreenPress = event => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 250;
    if (lastTap.current && now - lastTap.current < DOUBLE_PRESS_DELAY) {
      const {locationX} = event.nativeEvent;
      if (locationX < width / 3) {
        // Rewind 10s
        const newTime = Math.max(liveCurrentTime - 10, 0);
        if (videoRef?.current) {
          videoRef.current.seek(newTime);
          setCurrentTime(newTime);
        }
      } else if (locationX > (2 * width) / 3) {
        // Fast forward 10s
        const newTime = Math.min(liveCurrentTime + 10, duration);
        if (videoRef?.current) {
          videoRef.current.seek(newTime);
          setCurrentTime(newTime);
        }
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

  const playEpisode = async (targetSeason, targetEpisode) => {
    try {
      setShowEpisodesPanel(false);
      const s = await moviedb.seasonInfo({id, season_number: targetSeason});
      const info = await moviedb.tvInfo({id});
      const externalIds = await moviedb.episodeExternalIds({
        id,
        season_number: targetSeason,
        episode_number: targetEpisode,
      });

      navigation.replace('VideoPlayer', {
        id,
        type: 'tv',
        season: targetSeason,
        episode: targetEpisode,
        imdbId: externalIds.imdb_id,
      });

      state.addToContinueWatching({
        id: info.id,
        title: info.name,
        image: `https://image.tmdb.org/t/p/w500/${info.poster_path}`,
        type: 'tv',
        season: targetSeason,
        episode: targetEpisode,
        year: info.first_air_date?.split('-')[0],
      });
    } catch (e) {
      console.warn('playEpisode error', e);
    }
  };

  const handleNextEpisode = async () => {
    if (type !== 'tv' || !season || !episode) return;
    if (seasonEpisodes.length > 0 && episode < seasonEpisodes.length) {
      playEpisode(season, episode + 1);
    } else if (season < totalSeasons) {
      playEpisode(season + 1, 1);
    }
  };

  const isMuted = volume === 0;
  const toggleMute = () => {
    if (setVolume) {
      setVolume(isMuted ? 1 : 0);
    }
  };

  // Remaining time
  const remainingTimeStr = formatTime(Math.max(0, duration - liveCurrentTime));

  // Display title formatted like Image 1
  const displayTitle =
    type === 'tv'
      ? `${mediaTitle} E${episode || 1} ${episodeTitle || ''}`.trim()
      : mediaTitle;

  return (
    <View style={styles.container}>
      {/* Tap layer under the controls: taps on the empty picture area fall
       * through the box-none overlay to here, and while the controls are faded
       * out it is the only thing left that can bring them back. It stays
       * mounted so that never depends on a re-render. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={event => {
          if (isLocked) {
            showUnlockButton();
          } else {
            handleScreenPress(event);
          }
        }}
      />

      {/* Unlock button when locked */}
      <Animated.View
        pointerEvents={isLocked ? 'box-none' : 'none'}
        style={[
          styles.unlockButtonContainer,
          {opacity: unlockButtonAnim, display: isLocked ? 'flex' : 'none'},
        ]}>
        <TouchableOpacity
          onPress={handleUnlockPress}
          style={styles.unlockButton}>
          <Icon source="lock-open-outline" size={24} color="#fff" />
          <Text style={{color: '#fff', fontWeight: 'bold', marginLeft: 8}}>
            Unlock
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Main Overlay Controls */}
      <Animated.View
        pointerEvents={controlsVisible && !isLocked ? 'box-none' : 'none'}
        style={[styles.overlayContainer, {opacity: fadeAnim}]}>
        {/* Top Header Bar */}
        <View
          style={[
            styles.topBar,
            {
              paddingTop: Math.max(insets.top, 16),
              paddingLeft: Math.max(insets.left, 16),
              paddingRight: Math.max(insets.right, 16),
            },
          ]}
          pointerEvents="box-none">
          <IconButton
            icon="arrow-left"
            iconColor="#fff"
            size={28}
            onPress={() => navigation.goBack()}
          />
          <View style={{flex: 1}} />
          <IconButton
            icon="flag-outline"
            iconColor="#fff"
            size={24}
            onPress={() => {}}
          />
        </View>

        {/* Error message */}
        {playerError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {typeof playerError === 'string'
                ? playerError
                : 'Unable to stream. Please try another quality.'}
            </Text>
          </View>
        )}

        {/* Bottom Controls Bar (Netflix Style - Image 1) */}
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              paddingLeft: Math.max(insets.left, 16),
              paddingRight: Math.max(insets.right, 16),
            },
          ]}
          pointerEvents="box-none">
          {/* Progress Timeline Row */}
          <View style={styles.timelineRow}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration > 0 ? duration : 1}
              value={liveCurrentTime}
              onValueChange={handleSliderChange}
              minimumTrackTintColor="#E50914"
              maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
              thumbTintColor="#E50914"
            />
            <Text style={styles.remainingTimeText}>
              {remainingTimeStr}
            </Text>
          </View>

          {/* Controls Actions Row */}
          <View style={styles.actionsRow}>
            {/* Left Controls: Play/Pause, Rewind, Forward, Volume */}
            <View style={styles.leftActions}>
              <TouchableOpacity
                onPress={() => setIsPlaying(!isPlaying)}
                style={styles.iconButtonTouch}>
                <Icon
                  source={isPlaying ? 'pause' : 'play'}
                  size={30}
                  color="#fff"
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const newTime = Math.max(liveCurrentTime - 10, 0);
                  if (videoRef?.current) {
                    videoRef.current.seek(newTime);
                    setCurrentTime(newTime);
                  }
                }}
                style={styles.iconButtonTouch}>
                <Icon source="rewind-10" size={28} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const newTime = Math.min(liveCurrentTime + 10, duration);
                  if (videoRef?.current) {
                    videoRef.current.seek(newTime);
                    setCurrentTime(newTime);
                  }
                }}
                style={styles.iconButtonTouch}>
                <Icon source="fast-forward-10" size={28} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={toggleMute}
                style={styles.iconButtonTouch}>
                <Icon
                  source={isMuted ? 'volume-off' : 'volume-high'}
                  size={26}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>

            {/* Center: Title & Episode */}
            <View style={styles.centerTitleContainer}>
              <Text numberOfLines={1} style={styles.centerTitleText}>
                {displayTitle}
              </Text>
            </View>

            {/* Right Controls: Next Ep, Episodes, Audio/Sub, Speed, Aspect, Lock */}
            <View style={styles.rightActions}>
              {type === 'tv' && (
                <TouchableOpacity
                  onPress={handleNextEpisode}
                  style={styles.iconButtonTouch}>
                  <Icon source="skip-next" size={28} color="#fff" />
                </TouchableOpacity>
              )}

              {type === 'tv' && (
                <TouchableOpacity
                  onPress={() => {
                    console.log('EPISODES PRESSED', {
                      cur: showEpisodesPanel,
                      type,
                      season,
                      selectedSeason,
                      count: seasonEpisodes.length,
                    });
                    setShowEpisodesPanel(prev => !prev);
                    setShowAudioSubModal(false);
                    setShowSpeedMenu(false);
                  }}
                  style={styles.iconButtonTouch}>
                  <Icon source="playlist-play" size={28} color="#fff" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => {
                  setShowAudioSubModal(!showAudioSubModal);
                  setShowEpisodesPanel(false);
                  setShowSpeedMenu(false);
                }}
                style={styles.iconButtonTouch}>
                <Icon source="message-text-outline" size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowAudioSubModal(false);
                  setShowEpisodesPanel(false);
                }}
                style={styles.iconButtonTouch}>
                <Icon source="speedometer" size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const nextIndex = (resizeIndex + 1) % resizeModes.length;
                  setResizeIndex(nextIndex);
                  setResizeMode(resizeModes[nextIndex]);
                }}
                style={styles.iconButtonTouch}>
                <Icon source="aspect-ratio" size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLockPress}
                style={styles.iconButtonTouch}>
                <Icon source="lock-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Subtitles Text Overlay */}
      <Subtitle
        subtitleText={subtitleText}
        subtitleIsVisible={subtitleIsVisible}
        isRtl={isRtl}
        controlsVisible={controlsVisible && !isLocked}
      />

      {/* Netflix-Style Audio & Subtitles Overlay (Image 2) */}
      {showAudioSubModal && (
        <View style={styles.modalCenteredOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowAudioSubModal(false)}
          />
          <View style={[styles.audioSubCard, {maxWidth: isTablet ? 560 : 480}]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderTitle}>Audio & Subtitles</Text>
              <IconButton
                icon="close"
                iconColor="#fff"
                size={22}
                onPress={() => setShowAudioSubModal(false)}
              />
            </View>
            <Divider style={{backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 12}} />

            <View style={styles.twoColumnBody}>
              {/* Left Column: Audio & Quality */}
              <View style={styles.columnBox}>
                <Text style={styles.columnHeading}>Audio & Quality</Text>
                <ScrollView style={{maxHeight: isTablet ? 380 : 220}}>
                  <TouchableOpacity
                    style={styles.selectableRow}
                    onPress={() => {}}>
                    <View style={styles.checkIconBox}>
                      <Icon source="check" size={18} color="#fff" />
                    </View>
                    <Text style={styles.selectableText}>Original [Default]</Text>
                  </TouchableOpacity>

                  {playerQualities.map((q, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.selectableRow}
                      onPress={() => {
                        setUri(q.uri);
                      }}>
                      <View style={styles.checkIconBox} />
                      <Text style={styles.selectableText}>{q.resolution || 'Auto'}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Right Column: Subtitles */}
              <View style={[styles.columnBox, {borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)', paddingLeft: 16}]}>
                <Text style={styles.columnHeading}>Subtitles</Text>
                <ScrollView style={{maxHeight: isTablet ? 380 : 220}}>
                  {/* Off Option */}
                  <TouchableOpacity
                    style={styles.selectableRow}
                    onPress={() => setSubtitleIsVisible(false)}>
                    <View style={styles.checkIconBox}>
                      {!subtitleIsVisible && <Icon source="check" size={18} color="#fff" />}
                    </View>
                    <Text style={styles.selectableText}>Off</Text>
                  </TouchableOpacity>

                  {/* Languages */}
                  {langs.map(l => (
                    <TouchableOpacity
                      key={l.code}
                      style={styles.selectableRow}
                      onPress={() => {
                        setSelectedLang(l.code);
                        setCurrentLang(l.lang);
                        setSubtitleIsVisible(true);
                      }}>
                      <View style={styles.checkIconBox}>
                        {subtitleIsVisible && currentLang === l.lang && (
                          <Icon source="check" size={18} color="#fff" />
                        )}
                      </View>
                      <Text style={styles.selectableText}>{l.lang}</Text>
                    </TouchableOpacity>
                  ))}

                  {/* Subtitle track number */}
                  <View style={{marginTop: 12}}>
                    <Text style={[styles.columnHeading, {fontSize: 13, marginBottom: 6}]}>
                      Track
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {[0, 1, 2, 3, 4].map(idx => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => setSubtitleNumber(idx)}
                          style={[
                            styles.chipPill,
                            subtitleNumber === idx && styles.chipPillActive,
                          ]}>
                          <Text style={{color: '#fff', fontSize: 12}}>
                            #{idx + 1}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Subtitle Delay adjustment */}
                  <View style={{marginTop: 12}}>
                    <Text style={[styles.columnHeading, {fontSize: 13, marginBottom: 6}]}>
                      Sync Delay ({subtitleDelay > 0 ? `+${subtitleDelay}s` : `${subtitleDelay}s`})
                    </Text>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <TouchableOpacity
                        onPress={() => setSubtitleDelay(subtitleDelay - 1)}
                        style={styles.delayButton}>
                        <Text style={{color: '#fff', fontSize: 13}}>-1s</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setSubtitleDelay(0)}
                        style={[styles.delayButton, {marginHorizontal: 8}]}>
                        <Text style={{color: '#fff', fontSize: 13}}>Reset</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setSubtitleDelay(subtitleDelay + 1)}
                        style={styles.delayButton}>
                        <Text style={{color: '#fff', fontSize: 13}}>+1s</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Netflix-Style Episodes Panel (Image 3) */}
      {showEpisodesPanel && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowEpisodesPanel(false)}
          />
          <View style={[styles.episodesDrawer, {width: isTablet ? 480 : 380}]}>
            {/* Header: Season selector & close */}
            <View style={styles.episodesHeader}>
              <TouchableOpacity
                onPress={() => setSeasonDropdownVisible(!seasonDropdownVisible)}
                style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={{color: '#fff', fontSize: 18, fontWeight: 'bold'}}>
                  Season {selectedSeason}
                </Text>
                <Icon source="chevron-down" size={20} color="#fff" />
              </TouchableOpacity>
              <IconButton
                icon="close"
                iconColor="#fff"
                size={22}
                onPress={() => setShowEpisodesPanel(false)}
              />
            </View>

            {/* Season Dropdown List if opened */}
            {seasonDropdownVisible && (
              <View style={styles.seasonDropdown}>
                <ScrollView style={{maxHeight: 160}}>
                  {Array.from({length: totalSeasons}, (_, i) => i + 1).map(sNum => (
                    <TouchableOpacity
                      key={sNum}
                      onPress={() => {
                        setSelectedSeason(sNum);
                        setSeasonDropdownVisible(false);
                      }}
                      style={[
                        styles.seasonItem,
                        selectedSeason === sNum && styles.seasonItemActive,
                      ]}>
                      <Text style={{color: '#fff', fontSize: 14}}>
                        Season {sNum}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Divider style={{backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 8}} />

            {/* Episodes List */}
            <FlatList
              data={seasonEpisodes}
              keyExtractor={item => item.id.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({item}) => {
                const isCurrentEpisode =
                  selectedSeason === season && item.episode_number === episode;

                if (isCurrentEpisode) {
                  // Expanded active card like in Image 3
                  return (
                    <View style={styles.activeEpisodeCard}>
                      <Text style={styles.activeEpisodeTitle}>
                        {item.episode_number}  {item.name}
                      </Text>
                      <View style={{flexDirection: 'row', marginTop: 8}}>
                        <View style={styles.activeStillContainer}>
                          {item.still_path ? (
                            <Image
                              source={{
                                uri: `https://image.tmdb.org/t/p/w500/${item.still_path}`,
                              }}
                              style={{width: '100%', height: '100%'}}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={{flex: 1, backgroundColor: '#222'}} />
                          )}
                          <View style={styles.nowPlayingBadge}>
                            <Icon source="volume-high" size={14} color="#fff" />
                            <Text style={styles.nowPlayingText}>Now Playing</Text>
                          </View>
                        </View>
                        <View style={{flex: 1, paddingLeft: 12}}>
                          <Text numberOfLines={3} style={styles.activeEpisodeOverview}>
                            {item.overview || 'Now playing on Tefrija'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                }

                // Regular episode row like in Image 3
                return (
                  <TouchableOpacity
                    onPress={() => playEpisode(selectedSeason, item.episode_number)}
                    style={styles.episodeRow}>
                    <Text style={styles.episodeRowNumber}>
                      {item.episode_number}
                    </Text>
                    <Text numberOfLines={1} style={styles.episodeRowTitle}>
                      {item.name}
                    </Text>
                    <Icon source="play-outline" size={20} color="rgba(255,255,255,0.6)" />
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      )}

      {/* Speed Menu Popup */}
      {showSpeedMenu && (
        <View style={styles.modalCenteredOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowSpeedMenu(false)}
          />
          <View style={styles.speedCard}>
            <Text style={styles.speedHeader}>Playback Speed</Text>
            <Divider style={{backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 8}} />
            {speeds.map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => {
                  if (setPlaybackRate) setPlaybackRate(s);
                  setShowSpeedMenu(false);
                }}
                style={styles.speedRow}>
                <View style={styles.checkIconBox}>
                  {playbackRate === s && <Icon source="check" size={18} color="#fff" />}
                </View>
                <Text style={styles.speedText}>{s === 1.0 ? '1.0x (Normal)' : `${s}x`}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Background hidden ad WebView if present */}
      {adUrl && (
        <View
          style={{
            width: 1,
            height: 1,
            position: 'absolute',
            top: -1000,
            left: -1000,
          }}>
          <WebView source={{uri: adUrl}} style={{width: 1, height: 1}} />
        </View>
      )}
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
      zIndex: 50,
      bottom: controlsVisible ? 100 : 30,
    }}>
    {subtitleIsVisible && !!subtitleText?.trim() && (
      <View style={styles.subtitleBox}>
        <Text
          style={[
            styles.subtitleText,
            {textAlign: isRtl ? 'right' : 'center'},
          ]}>
          {subtitleText.trim()}
        </Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 10,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 20,
  },
  errorContainer: {
    position: 'absolute',
    top: 75,
    alignSelf: 'center',
    backgroundColor: 'rgba(229, 9, 20, 0.85)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    zIndex: 25,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    zIndex: 20,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6,
  },
  slider: {
    flex: 1,
    height: 40,
    marginRight: 12,
  },
  remainingTimeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    minWidth: 48,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButtonTouch: {
    padding: 8,
    marginHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerTitleContainer: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  centerTitleText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  unlockButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 150,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderWidth: 1,
    borderColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  subtitleContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  subtitleBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  subtitleText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 100,
  },
  modalCenteredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioSubCard: {
    width: '90%',
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  twoColumnBody: {
    flexDirection: 'row',
  },
  columnBox: {
    flex: 1,
    paddingRight: 12,
  },
  columnHeading: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  selectableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkIconBox: {
    width: 24,
    alignItems: 'center',
    marginRight: 6,
  },
  selectableText: {
    color: '#ffffff',
    fontSize: 14,
  },
  chipPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginRight: 6,
  },
  chipPillActive: {
    backgroundColor: '#E50914',
  },
  delayButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  episodesDrawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#141414',
    padding: 16,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    elevation: 16,
    zIndex: 110,
  },
  episodesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  seasonDropdown: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 6,
    marginVertical: 6,
  },
  seasonItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  seasonItemActive: {
    backgroundColor: '#333',
  },
  activeEpisodeCard: {
    backgroundColor: '#202020',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  activeEpisodeTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  activeStillContainer: {
    width: 120,
    height: 70,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  nowPlayingBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingVertical: 2,
  },
  nowPlayingText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  activeEpisodeOverview: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 16,
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  episodeRowNumber: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    width: 28,
  },
  episodeRowTitle: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
    paddingRight: 8,
  },
  speedCard: {
    width: 260,
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 12,
  },
  speedHeader: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  speedText: {
    color: '#ffffff',
    fontSize: 14,
  },
});

export default ExtraControls;
