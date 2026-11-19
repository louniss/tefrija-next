import React, {Component, useEffect} from 'react';
import {Image, ScrollView, View, StyleSheet} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Caption,
  Card,
  Chip,
  Headline,
  IconButton,
  Text,
} from 'react-native-paper';

import {moviedb} from '../movieDb';
import useMainState from '../state/Main';
import useStreamStore, {streamKey} from '../stream/store';
import Animated from 'react-native-reanimated';
import useResponsive from '../utils/useResponsive';

const MovieDetail = ({navigation, route}) => {
  const [movie, setMovie] = React.useState({});
  const state = useMainState();
  const {isTablet} = useResponsive();
  const downloads = useStreamStore(store => store.downloads);
  const downloadKey = movie.id ? streamKey({type: 'movie', id: movie.id}) : null;
  const download = downloadKey ? downloads[downloadKey] : null;

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
        useStreamStore.getState().syncDownloadMeta({
          type: 'movie',
          id: res.id,
          title: res.title,
          poster: `https://image.tmdb.org/t/p/w200/${res.poster_path}`,
          year: (res.release_date || '').split('-')[0],
        });
      });
  }, [route.params?.movie?.id]);

  const [loading, setLoading] = React.useState(false);

  const startDownload = () => {
    if (!movie.id) {
      return;
    }
    useStreamStore.getState().queueDownload({
      key: streamKey({type: 'movie', id: movie.id}),
      id: movie.id,
      type: 'movie',
      season: null,
      episode: null,
      title: movie.title,
      poster: `https://image.tmdb.org/t/p/w200/${movie.poster_path}`,
      year: (movie.release_date || '').split('-')[0],
    });
  };

  const downloadLabel = () => {
    if (!download) {
      return 'Download';
    }
    switch (download.status) {
      case 'completed':
        return 'Downloaded';
      case 'downloading':
        return download.total
          ? `Downloading ${download.done}/${download.total}`
          : 'Preparing…';
      case 'queued':
        return 'Queued';
      case 'error':
        return 'Retry download';
      default:
        return 'Download';
    }
  };

  const play = () => {
    state.addToContinueWatching({
      id: movie.id,
      title: movie.title,
      type: 'movie',
      time: 0,
      image: `https://image.tmdb.org/t/p/w500/${movie.backdrop_path}`,
      year: movie.release_date ? movie.release_date.split('-')[0] : '',
    });
    navigation.navigate('VideoPlayer', {
      type: 'movie',
      id: movie.id,
      imdbId: movie.imdb_id,
    });
  };

  const handleBack = () => {
    if (route?.params?.fromSearch) {
      navigation.navigate('Search');
    } else {
      navigation.goBack();
    }
  };

  if (isTablet) {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
        {/* Backdrop Header */}
        <View style={{height: 300, width: '100%', backgroundColor: '#111'}}>
          <Image
            source={{
              uri: movie.backdrop_path
                ? `https://image.tmdb.org/t/p/w1280/${movie.backdrop_path}`
                : `https://image.tmdb.org/t/p/w780/${movie.poster_path}`,
            }}
            style={{width: '100%', height: '100%'}}
            resizeMode="cover"
          />
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
          />
          <IconButton
            mode="contained-tonal"
            icon="arrow-left"
            size={24}
            style={{position: 'absolute', top: 16, left: 16, zIndex: 10}}
            onPress={handleBack}
          />
        </View>

        {/* Two Column Layout: Poster on left, details on right */}
        <View
          style={{
            flexDirection: 'row',
            marginTop: -90,
            paddingHorizontal: 24,
          }}>
          {/* Left Column: Poster + Actions */}
          <View style={{width: 260, alignItems: 'center'}}>
            <View
              style={{
                width: 260,
                height: 380,
                borderRadius: 12,
                overflow: 'hidden',
                elevation: 10,
                backgroundColor: '#222',
              }}>
              <Animated.Image
                source={{
                  uri: `https://image.tmdb.org/t/p/w780/${movie.poster_path}`,
                }}
                style={{width: '100%', height: '100%'}}
                resizeMode="cover"
                sharedTransitionTag="movie-image"
              />
              <View style={styles.absoluteCenter}>
                {loading ? (
                  <ActivityIndicator mode="contained" size={40} />
                ) : (
                  <IconButton
                    size={48}
                    mode="contained"
                    icon="play"
                    onPress={play}
                  />
                )}
              </View>
            </View>

            <View style={{width: '100%', marginTop: 16}}>
              <Button
                style={{marginVertical: 4, borderRadius: 8}}
                mode="contained"
                loading={loading}
                disabled={loading}
                onPress={play}
                icon="play">
                Play
              </Button>
              <Button
                style={{marginVertical: 4, borderRadius: 8}}
                mode="contained-tonal"
                disabled={
                  !movie.id ||
                  (download &&
                    (download.status === 'downloading' || download.status === 'queued'))
                }
                onPress={startDownload}
                icon={download && download.status === 'completed' ? 'check' : 'download'}>
                {downloadLabel()}
              </Button>
            </View>
          </View>

          {/* Right Column: Title, Badges, Genres, Overview */}
          <View style={{flex: 1, paddingLeft: 28, paddingTop: 100}}>
            <Headline style={{fontSize: 28, fontWeight: 'bold', marginBottom: 4}}>
              {movie.title}
            </Headline>

            {movie.tagline ? (
              <Caption style={{fontSize: 15, fontStyle: 'italic', marginBottom: 8}}>
                "{movie.tagline}"
              </Caption>
            ) : null}

            <View style={{flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 12}}>
              {movie.vote_average ? (
                <Chip disabled style={{backgroundColor: '#f59e0b', marginRight: 8, marginVertical: 4}}>
                  ★ {Number(movie.vote_average).toFixed(1)}
                </Chip>
              ) : null}
              {movie.release_date ? (
                <Chip disabled style={{marginRight: 8, marginVertical: 4}}>
                  {new Date(movie.release_date).getFullYear()}
                </Chip>
              ) : null}
              {movie.runtime ? (
                <Chip disabled style={{marginRight: 8, marginVertical: 4}}>
                  {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                </Chip>
              ) : null}
              <Chip style={{marginRight: 8, marginVertical: 4}} icon="high-definition">
                HD
              </Chip>
            </View>

            {movie.genres && movie.genres.length > 0 ? (
              <View style={{flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14}}>
                {movie.genres.map(g => (
                  <Chip key={g.id} style={{marginRight: 6, marginBottom: 6}}>
                    {g.name}
                  </Chip>
                ))}
              </View>
            ) : null}

            <Card style={{padding: 16, borderRadius: 10, marginTop: 4}}>
              <Headline style={{fontSize: 18, fontWeight: 'bold', marginBottom: 6}}>Overview</Headline>
              <Text style={{fontSize: 15, lineHeight: 22, opacity: 0.9}}>
                {movie.overview || 'No overview available.'}
              </Text>
            </Card>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Mobile layout
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
          onPress={handleBack}
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
          disabled={
            !movie.id ||
            (download &&
              (download.status === 'downloading' || download.status === 'queued'))
          }
          onPress={startDownload}
          icon={download && download.status === 'completed' ? 'check' : 'download'}>
          {downloadLabel()}
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
