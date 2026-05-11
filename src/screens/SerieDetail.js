import React, { useEffect, useState } from 'react';
import { Button, Caption, Divider, Icon, Menu, Subheading, IconButton } from 'react-native-paper';

import {
  FlatList,
  Image,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';

import { moviedb } from '../movieDb';

import useMainState from '../state/Main';

const SerieDetails = ({ navigation, route }) => {
  const { serie } = route.params;
  const [episodes, setEpisodes] = useState([]);
  const [season, setSeason] = useState(serie?.season || 1);
  const [episode, setEpisode] = useState(serie?.episode || 1);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);

  const state = useMainState();

  // Load show overview (seasons) when serie changes
  useEffect(() => {
    if (!serie?.id) return;
    setLoading(true);
    setSeasons([]);
    // don't mutate route params; compute image separately
    moviedb
      .tvInfo({ id: serie.id, append_to_response: 'seasons' })
      .then(res => {
        setSeasons(res.seasons.length || 0);
        // prefill serie.image if it wasn't provided
        if (!serie.image && res.poster_path) {
          serie.image = `https://image.tmdb.org/t/p/w500/${res.poster_path}`;
        }
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

  const EpisodeItem = ({ episode, s, navigation }) => {
    const state = useMainState();

    return (
      <TouchableOpacity
        onPress={async () => {
          state.addToContinueWatching({
            id: s.id,
            title: s.title,
            image: s.image,
            type: 'tv',
            season: episode.season_number,
            episode: episode.episode_number,
            year: serie.year,
          });

          const externalIds = await moviedb.episodeExternalIds({
            id: s.id,
            season_number: episode.season_number,
            episode_number: episode.episode_number,
          });

          navigation.navigate('VideoPlayer', {
            id: s.id,
            type: 'tv',
            season: episode.season_number,
            episode: episode.episode_number,
            imdbId: externalIds.imdb_id,
          });
        }}>
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
          <Caption style={{ padding: 10 }}>{episode.name}</Caption>
        </View>
        <Divider />
      </TouchableOpacity>
    );
  };

  const continueWatching = state.getById(serie.id);

  return (
    <ScrollView>
      <Image source={{ uri: serie.image }} style={{ width: '100%', height: 200 }} />

      <IconButton
        mode="contained-tonal"
        onPress={() => {
          if (route?.params?.fromSearch) {
            navigation.navigate('Search');
          } else {
            navigation.goBack();
          }
        }}
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
