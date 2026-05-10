import React, {useEffect, useState} from 'react';
import {Button, Caption, Divider, Menu, Subheading, IconButton} from 'react-native-paper';

import {
  FlatList,
  Image,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';

import {moviedb} from '../movieDb';

import useMainState from '../state/Main';

const SerieDetails = ({navigation, route}) => {
  const {serie} = route.params;
  const fromSearch = route.params?.fromSearch;
  const [episodes, setEpisodes] = useState([]);
  const [season, setSeason] = useState(serie.season || 1);
  const [episode, setEpisode] = useState(serie.episode || 1);
  const [seasons, setSeasons] = useState([]);

  const [menuVisible, setMenuVisible] = useState(false);

  const state = useMainState();

  useEffect(() => {
    const s = moviedb.tvInfo({
      id: serie.id,
      append_to_response: 'seasons',
    });
    s.then(res => {
      setSeasons(res.seasons.length);
      serie.image = `https://image.tmdb.org/t/p/w500/${res.poster_path}`;
      const e = moviedb
        .seasonInfo({
          id: serie.id,
          season_number: season,
          append_to_response: 'episodes',
        })
        .then(res => {
          setEpisodes(res.episodes);
        });
    });
  }, [season, serie.id, navigation]);

  const EpisodeItem = ({episode, s, navigation}) => {
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
            style={{width: 100, height: 100, borderRadius: 10}}
          />
          <Caption style={{padding: 10}}>{episode.episode_number}</Caption>
          <Caption style={{padding: 10}}>{episode.name}</Caption>
        </View>
        <Divider />
      </TouchableOpacity>
    );
  };

  const continueWatching = state.getById(serie.id);

  return (
    <ScrollView>
      <Image source={{uri: serie.image}} style={{width: '100%', height: 200}} />
      <IconButton
        icon="arrow-left"
        mode="contained-tonal"
        onPress={() => {
          if (fromSearch) {
            navigation.navigate('Search');
          } else {
            navigation.goBack();
          }
        }}
        style={{position: 'absolute', left: 0, top: 0}}
      />
      <Subheading style={{padding: 10}}>
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
            style={{width: 200}}
            mode="text"
            onPress={() => {
              setMenuVisible(true);
            }}>
            Season {season}
          </Button>
        }>
        <FlatList
          data={Array.from({length: seasons}, (_, i) => i + 1)}
          renderItem={({item}) => (
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
        renderItem={({item}) => (
          <EpisodeItem episode={item} s={serie} navigation={navigation} />
        )}
        keyExtractor={item => item.id.toString()}
      />
    </ScrollView>
  );
};

export default SerieDetails;
