import React, {Component, useEffect} from 'react';
import {Image, ScrollView, View} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Caption,
  Card,
  Chip,
  Headline,
  IconButton,
} from 'react-native-paper';

import {moviedb} from '../movieDb';
import useMainState from '../state/Main';
import Animated from 'react-native-reanimated';

const MovieDetail = ({navigation, route}) => {
  const [movie, setMovie] = React.useState({});
  const state = useMainState();

  useEffect(() => {
    const movieParam = route.params?.movie;
    if (!movieParam) return;
    setMovie({});
    moviedb
      .movieInfo({
        id: movieParam.id,
      })
      .then(res => {
        setMovie(res);
      });
  }, [route.params?.movie?.id]);

  const [loading, setLoading] = React.useState(false);

  const play = () => {
    state.addToContinueWatching({
      id: movie.id,
      title: movie.title,
      type: 'movie',
      time: 0,
      image: `https://image.tmdb.org/t/p/w500/${movie.backdrop_path}`,
      year: movie.release_date.split('-')[0],
    });
    navigation.navigate('VideoPlayer', {
      type: 'movie',
      id: movie.id,
      imdbId: movie.imdb_id,
    });
  };

  return (
    <ScrollView>
      <View>
        <Animated.Image
          style={styles.image}
          source={{
            uri: `https://image.tmdb.org/t/p/w780/${movie.poster_path}`,
          }}
          sharedTransitionTag="movie-image"
        />

        <IconButton
          mode="contained-tonal"
          onPress={() => {
            if (route?.params?.fromSearch) {
              navigation.navigate('Search');
            } else {
              navigation.goBack();
            }
          }}
          style={styles.absolute}
          icon="arrow-left"
        />

        <View style={styles.absoluteCenter}>
          {loading ? (
            <ActivityIndicator mode="contained" size={40} />
          ) : (
            <IconButton
              size={40}
              mode="contained"
              icon={'play'}
              onPress={play}
            />
          )}
        </View>
      </View>

      <Card style={{padding: 5}}>
        <Headline>{movie.title}</Headline>
        <View style={{flexDirection: 'row', alignItems: 'center', padding: 5}}>
          <Chip disabled style={{backgroundColor: 'orange', marginRight: 5}}>
            {movie.vote_average}
          </Chip>
          <Chip disabled>{new Date(movie.release_date).getFullYear()}</Chip>
          <Chip style={{marginLeft: 5}} icon="high-definition" />
        </View>

        <Button
          style={{margin: 5, borderRadius: 5}}
          mode="contained-tonal"
          disabled={loading}
          loading={loading}
          icon="download">
          Download
        </Button>
        <Button
          style={{margin: 5, borderRadius: 5}}
          mode="contained-tonal"
          loading={loading}
          disabled={loading}
          onPress={play}
          icon="play">
          Play
        </Button>
      </Card>

      <Card style={{margin: 5, padding: 5}}>
        <Caption>{movie.overview}</Caption>
      </Card>
    </ScrollView>
  );
};

const styles = {
  absolute: {
    position: 'absolute',
  },

  absoluteCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  image: {width: '100%', height: 500},
};

export default MovieDetail;
