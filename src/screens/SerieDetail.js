import React, { useEffect, useState } from 'react';
import { Button, Caption, Divider, Icon, Menu, Subheading, Headline, IconButton, useTheme, Card, Text } from 'react-native-paper';

import {
  FlatList,
  Image,
  ScrollView,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';

import { moviedb } from '../movieDb';

import useMainState from '../state/Main';
import useStreamStore, { streamKey } from '../stream/store';
import useResponsive from '../utils/useResponsive';

const downloadEpisode = ({
  serie,
  seasonNumber,
  episodeNumber,
  stillPath,
  episodeTitle,
}) => {
  useStreamStore.getState().queueDownload({
    key: streamKey({
      type: 'tv',
      id: serie.id,
      season: seasonNumber,
      episode: episodeNumber,
    }),
    id: serie.id,
    type: 'tv',
    season: seasonNumber,
    episode: episodeNumber,
    title: serie.title,
    // The show poster heads the group, the still identifies the episode.
    poster: serie.image,
    still: stillPath ? `https://image.tmdb.org/t/p/w200/${stillPath}` : '',
    episodeTitle: episodeTitle || '',
    year: serie.year,
  });
};

const downloadIcon = item => {
  if (!item) {
    return 'download';
  }
  switch (item.status) {
    case 'completed':
      return 'check-circle';
    case 'downloading':
    case 'queued':
      return 'progress-download';
    case 'paused':
      return 'pause-circle';
    case 'error':
      return 'alert-circle';
    default:
      return 'download';
  }
};

const SerieDetails = ({ navigation, route }) => {
  const { serie } = route.params;
  const [episodes, setEpisodes] = useState([]);
  const [season, setSeason] = useState(serie?.season || 1);
  const [episode, setEpisode] = useState(serie?.episode || 1);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);

  const state = useMainState();
  const theme = useTheme();
  const { isTablet } = useResponsive();

  const handleBack = () => {
    if (route?.params?.fromSearch) {
      navigation.navigate('Search');
    } else {
      navigation.goBack();
    }
  };

  // Load show overview (seasons) when serie changes
  useEffect(() => {
    if (!serie?.id) return;
    setLoading(true);
    setSeasons([]);
    moviedb
      .tvInfo({ id: serie.id, append_to_response: 'seasons' })
      .then(res => {
        setSeasons(res.seasons.length || 0);
        if (!serie.image && res.poster_path) {
          serie.image = `https://image.tmdb.org/t/p/w500/${res.poster_path}`;
        }
        useStreamStore.getState().syncDownloadMeta({
          type: 'tv',
          id: serie.id,
          title: serie.title,
          poster: serie.image,
          year: serie.year,
        });
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [serie?.id]);

  // Load episodes when season or serie changes
  useEffect(() => {
    if (!serie?.id) return;
    setEpisodes([]);
    setLoading(true);
    moviedb
      .seasonInfo({ id: serie.id, season_number: season, append_to_response: 'episodes' })
      .then(res => {
        setEpisodes(res.episodes || []);
      })
      .catch(() => setEpisodes([]))
      .finally(() => setLoading(false));
  }, [season, serie?.id]);

  // Reset local navigation state when switching to a different serie
  useEffect(() => {
    setSeason(serie?.season || 1);
    setEpisode(serie?.episode || 1);
    setSeasons([]);
    setEpisodes([]);
  }, [serie?.id]);

  const onEpisodePress = async (item) => {
    state.addToContinueWatching({
      id: serie.id,
      title: serie.title,
      image: serie.image,
      type: 'tv',
      season: item.season_number,
      episode: item.episode_number,
      year: serie.year,
    });

    const externalIds = await moviedb.episodeExternalIds({
      id: serie.id,
      season_number: item.season_number,
      episode_number: item.episode_number,
    });

    navigation.navigate('VideoPlayer', {
      id: serie.id,
      type: 'tv',
      season: item.season_number,
      episode: item.episode_number,
      imdbId: externalIds.imdb_id,
    });
  };

  const EpisodeItem = ({ episode, s, navigation }) => {
    const downloads = useStreamStore(store => store.downloads);
    const key = streamKey({
      type: 'tv',
      id: s.id,
      season: episode.season_number,
      episode: episode.episode_number,
    });
    const download = downloads[key];

    return (
      <TouchableOpacity onPress={() => onEpisodePress(episode)}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 10,
          }}>
          <Image
            source={{
              uri: `https://image.tmdb.org/t/p/w500/${episode.still_path}`,
            }}
            style={{ width: 100, height: 100, borderRadius: 10 }}
          />
          <Caption style={{ padding: 10 }}>{episode.episode_number}</Caption>
          <Caption style={{ padding: 10, flex: 1 }}>{episode.name}</Caption>
          <IconButton
            icon={downloadIcon(download)}
            iconColor={
              download && download.status !== 'completed'
                ? theme.colors.primary
                : undefined
            }
            size={20}
            onPress={() =>
              downloadEpisode({
                serie: s,
                seasonNumber: episode.season_number,
                episodeNumber: episode.episode_number,
                stillPath: episode.still_path,
                episodeTitle: episode.name,
              })
            }
          />
        </View>
        <Divider />
      </TouchableOpacity>
    );
  };

  const TabletEpisodeItem = ({ episode, s }) => {
    const downloads = useStreamStore(store => store.downloads);
    const key = streamKey({
      type: 'tv',
      id: s.id,
      season: episode.season_number,
      episode: episode.episode_number,
    });
    const download = downloads[key];

    return (
      <TouchableOpacity
        onPress={() => onEpisodePress(episode)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          paddingHorizontal: 8,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: 'rgba(150, 150, 150, 0.2)',
        }}>
        <View style={{ width: 140, height: 80, borderRadius: 8, overflow: 'hidden', backgroundColor: '#222' }}>
          {episode.still_path ? (
            <Image
              source={{
                uri: `https://image.tmdb.org/t/p/w500/${episode.still_path}`,
              }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Icon source="movie-outline" size={32} color="#666" />
            </View>
          )}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.25)',
            }}>
            <Icon source="play-circle-outline" size={28} color="#fff" />
          </View>
        </View>

        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                backgroundColor: 'rgba(150, 150, 150, 0.2)',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                marginRight: 8,
              }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold' }}>
                EP {episode.episode_number}
              </Text>
            </View>
            <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: 'bold', flex: 1 }}>
              {episode.name}
            </Text>
          </View>
          {episode.overview ? (
            <Text numberOfLines={2} style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
              {episode.overview}
            </Text>
          ) : null}
        </View>

        <IconButton
          icon={downloadIcon(download)}
          iconColor={
            download && download.status !== 'completed'
              ? theme.colors.primary
              : undefined
          }
          size={24}
          onPress={() =>
            downloadEpisode({
              serie: s,
              seasonNumber: episode.season_number,
              episodeNumber: episode.episode_number,
              stillPath: episode.still_path,
              episodeTitle: episode.name,
            })
          }
        />
      </TouchableOpacity>
    );
  };

  const continueWatching = state.getById(serie.id);

  if (isTablet) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', padding: 16 }}>
        {/* Left Column: Show info and actions */}
        <View style={{ width: 340, paddingRight: 20 }}>
          <IconButton
            mode="contained-tonal"
            onPress={handleBack}
            style={{ marginBottom: 12 }}
            icon="arrow-left"
          />

          <View style={{ width: '100%', height: 210, borderRadius: 12, overflow: 'hidden', backgroundColor: '#222' }}>
            <Image
              source={{ uri: serie.image }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>

          <Headline style={{ fontSize: 24, fontWeight: 'bold', marginTop: 12 }}>
            {serie.title}
          </Headline>
          <Caption style={{ fontSize: 14 }}>{serie.year}</Caption>

          {continueWatching ? (
            <Button
              mode="contained"
              icon="play"
              style={{ marginTop: 12, borderRadius: 8 }}
              onPress={() => {
                navigation.navigate('VideoPlayer', {
                  id: continueWatching.id,
                  type: 'tv',
                  season: continueWatching.season,
                  episode: continueWatching.episode,
                });
              }}>
              Continue S{continueWatching.season} E{continueWatching.episode}
            </Button>
          ) : null}

          {/* Season Selector */}
          <Menu
            visible={menuVisible}
            onDismiss={() => {
              setMenuVisible(false);
            }}
            anchor={
              <Button
                style={{ marginTop: 12, borderRadius: 8 }}
                mode="outlined"
                icon="menu-down"
                onPress={() => {
                  setMenuVisible(true);
                }}>
                Season {season}
              </Button>
            }>
            <FlatList
              data={Array.from({ length: seasons }, (_, i) => i + 1)}
              renderItem={({ item }) => (
                <Menu.Item
                  onPress={() => {
                    setSeason(item);
                    setMenuVisible(false);
                  }}
                  title={`Season ${item}`}
                />
              )}
              keyExtractor={item => item.toString()}
            />
          </Menu>

          <Button
            style={{ marginTop: 10, borderRadius: 8 }}
            mode="contained-tonal"
            icon="download"
            disabled={!episodes.length}
            onPress={() => {
              episodes.forEach(item =>
                downloadEpisode({
                  serie,
                  seasonNumber: item.season_number,
                  episodeNumber: item.episode_number,
                  stillPath: item.still_path,
                  episodeTitle: item.name,
                }),
              );
            }}>
            Download season {season}
          </Button>
        </View>

        {/* Right Column: Episodes List */}
        <View style={{ flex: 1, paddingLeft: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Headline style={{ fontSize: 20, fontWeight: 'bold' }}>
              Season {season} Episodes ({episodes.length})
            </Headline>
          </View>

          <FlatList
            data={episodes}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TabletEpisodeItem episode={item} s={serie} />
            )}
            keyExtractor={item => item.id.toString()}
          />
        </View>
      </View>
    );
  }

  // Mobile layout
  return (
    <ScrollView>
      <Image source={{ uri: serie.image }} style={{ width: '100%', height: 200 }} />

      <IconButton
        mode="contained-tonal"
        onPress={handleBack}
        style={{ position: 'absolute', top: 10, left: 10, zIndex: 1 }}
        icon="arrow-left"
      />
      <Subheading style={{ padding: 10 }}>
        {serie.title} ({serie.year})
      </Subheading>
      {continueWatching ? (
        <Button
          onPress={() => {
            navigation.navigate('VideoPlayer', {
              id: continueWatching.id,
              type: 'tv',
              season: continueWatching.season,
              episode: continueWatching.episode,
            });
          }}>
          Continue Season {continueWatching.season} Episode{' '}
          {continueWatching.episode}
        </Button>
      ) : null}
      <Button
        style={{ marginHorizontal: 10 }}
        mode="outlined"
        icon="download"
        disabled={!episodes.length}
        onPress={() => {
          episodes.forEach(item =>
            downloadEpisode({
              serie,
              seasonNumber: item.season_number,
              episodeNumber: item.episode_number,
              stillPath: item.still_path,
              episodeTitle: item.name,
            }),
          );
        }}>
        Download season {season}
      </Button>
      <Menu
        visible={menuVisible}
        onDismiss={() => {
          setMenuVisible(false);
        }}
        anchor={
          <Button
            style={{ width: 200 }}
            mode="text"
            onPress={() => {
              setMenuVisible(true);
            }}>
            Season {season}
          </Button>
        }>
        <FlatList
          data={Array.from({ length: seasons }, (_, i) => i + 1)}
          renderItem={({ item }) => (
            <Menu.Item
              onPress={() => {
                setSeason(item);
                setMenuVisible(false);
              }}
              title={`Season ${item}`}
            />
          )}
          keyExtractor={item => item.toString()}
        />
      </Menu>
      <FlatList
        data={episodes}
        renderItem={({ item }) => (
          <EpisodeItem episode={item} s={serie} navigation={navigation} />
        )}
        keyExtractor={item => item.id.toString()}
      />
    </ScrollView>
  );
};

export default SerieDetails;
