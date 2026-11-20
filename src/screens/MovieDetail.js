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
  ProgressBar,
  Text,
  useTheme,
} from 'react-native-paper';

import {moviedb} from '../movieDb';
import useMainState from '../state/Main';
import useStreamStore, {streamKey} from '../stream/store';
import Animated from 'react-native-reanimated';
import useResponsive from '../utils/useResponsive';

const MovieDetail = ({navigation, route}) => {
  const [movie, setMovie] = React.useState({});
  const state = useMainState();
  const theme = useTheme();
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

  const percent =
    download && download.total
      ? Math.min(100, Math.round((download.done / download.total) * 100))
      : 0;

  const downloadLabel = () => {
    if (!download) {
      return 'Download';
    }
    switch (download.status) {
      case 'completed':
        return download.skipped ? `Downloaded · ${percent}%` : 'Downloaded';
      case 'downloading':
        return download.total ? `${percent}%` : 'Preparing…';
      case 'queued':
        return download.total ? `Queued · ${percent}%` : 'Queued';
      case 'paused':
        return `Paused · ${percent}%`;
      case 'error':
        return 'Retry download';
      default:
        return 'Download';
    }
  };

  const downloadIcon = () => {
    if (!download) {
      return 'download';
    }
    switch (download.status) {
      case 'completed':
        return 'check';
      case 'downloading':
      case 'queued':
        return 'pause';
      case 'paused':
      case 'error':
        return 'download';
      default:
        return 'download';
    }
  };

  /* One button does the whole cycle: start, pause, resume. It is never disabled
   * while a download runs — a disabled Paper button greys its label out on a
   * tonal background, which read as "no text at all". */
  const onDownloadPress = () => {
    const store = useStreamStore.getState();
    if (!download || download.status === 'completed' || download.status === 'error') {
      startDownload();
      return;
    }
    if (download.status === 'downloading' || download.status === 'queued') {
      if (download.status === 'queued') {
        // Nothing has started yet: simply drop it from the queue.
        store.removeStream(download.key);
        return;
      }
      store.pauseDownload(download.key);
      return;
    }
    if (download.status === 'paused') {
      store.resumeDownload(download.key);
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
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Home');
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
                disabled={!movie.id}
                textColor={theme.colors.onSecondaryContainer}
                onPress={onDownloadPress}
                icon={downloadIcon()}>
                {downloadLabel()}
              </Button>
              {download &&
              (download.status === 'downloading' ||
                download.status === 'paused') ? (
                <ProgressBar
                  progress={percent / 100}
                  style={{marginHorizontal: 4, height: 3, borderRadius: 2}}
                />
              ) : null}
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
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
  const rating = movie.vote_average ? Number(movie.vote_average).toFixed(1) : null;
  const runtimeStr = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{flex: 1, backgroundColor: '#121212'}}
      contentContainerStyle={{paddingBottom: 40, backgroundColor: '#121212'}}>
      {/* Backdrop Header */}
      <View style={{height: 300, width: '100%', position: 'relative', backgroundColor: '#1c1c1e'}}>
        <Image
          source={{
            uri: movie.backdrop_path
              ? `https://image.tmdb.org/t/p/w1280/${movie.backdrop_path}`
              : `https://image.tmdb.org/t/p/w780/${movie.poster_path}`,
          }}
          style={{width: '100%', height: '100%'}}
          resizeMode="cover"
        />

        {/* Gradient shadow for seamless fade to dark background */}
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        />

        {/* Floating Back Button */}
        <IconButton
          mode="contained-tonal"
          icon="arrow-left"
          size={22}
          containerColor="rgba(0,0,0,0.6)"
          iconColor="#ffffff"
          style={{position: 'absolute', top: 12, left: 12, zIndex: 10}}
          onPress={handleBack}
        />

        {/* Big Play Overlay in Center of Backdrop */}
        <View style={styles.absoluteCenter}>
          {loading ? (
            <ActivityIndicator mode="contained" size={44} color="#ffffff" />
          ) : (
            <IconButton
              size={48}
              mode="contained"
              containerColor="rgba(229, 9, 20, 0.9)"
              iconColor="#ffffff"
              icon="play"
              onPress={play}
            />
          )}
        </View>
      </View>

      {/* Main Content Info */}
      <View style={{paddingHorizontal: 16, marginTop: 14}}>
        <Text style={{fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginBottom: 4}}>
          {movie.title}
        </Text>

        {movie.tagline ? (
          <Text style={{fontSize: 14, fontStyle: 'italic', color: 'rgba(255,255,255,0.65)', marginBottom: 10}}>
            "{movie.tagline}"
          </Text>
        ) : null}

        {/* Meta badges row */}
        <View style={{flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 14}}>
          {rating && rating > 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 184, 0, 0.25)',
                borderColor: 'rgba(255, 184, 0, 0.6)',
                borderWidth: 1,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
                marginRight: 8,
                marginVertical: 4,
              }}>
              <Text style={{color: '#FFB800', fontWeight: 'bold', fontSize: 12, marginRight: 3}}>
                ★
              </Text>
              <Text style={{color: '#ffffff', fontWeight: 'bold', fontSize: 12}}>
                {rating}
              </Text>
            </View>
          )}

          {year ? (
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
                marginRight: 8,
                marginVertical: 4,
              }}>
              <Text style={{color: '#ffffff', fontSize: 12, fontWeight: '500'}}>{year}</Text>
            </View>
          ) : null}

          {runtimeStr ? (
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
                marginRight: 8,
                marginVertical: 4,
              }}>
              <Text style={{color: '#ffffff', fontSize: 12, fontWeight: '500'}}>{runtimeStr}</Text>
            </View>
          ) : null}

          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              paddingHorizontal: 6,
              paddingVertical: 3,
              borderRadius: 6,
              marginVertical: 4,
            }}>
            <Text style={{color: '#ffffff', fontSize: 11, fontWeight: 'bold'}}>HD</Text>
          </View>
        </View>

        {/* Action Buttons: Play & Download */}
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 14}}>
          <Button
            mode="contained"
            icon="play"
            buttonColor="#E50914"
            textColor="#ffffff"
            loading={loading}
            disabled={loading}
            onPress={play}
            style={{flex: 1, marginRight: 8, borderRadius: 10}}
            contentStyle={{height: 44}}
            labelStyle={{fontWeight: 'bold', fontSize: 15}}>
            Play
          </Button>

          <Button
            mode="contained-tonal"
            icon={download && download.status === 'completed' ? 'check' : 'download'}
            buttonColor="rgba(255,255,255,0.15)"
            textColor="#ffffff"
            disabled={
              !movie.id ||
              (download &&
                (download.status === 'downloading' || download.status === 'queued'))
            }
            onPress={startDownload}
            style={{flex: 1, borderRadius: 10}}
            contentStyle={{height: 44}}
            labelStyle={{fontWeight: 'bold', fontSize: 14}}>
            {downloadLabel()}
          </Button>
        </View>

        {/* Genre pills */}
        {movie.genres && movie.genres.length > 0 ? (
          <View style={{flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14}}>
            {movie.genres.map(g => (
              <View
                key={g.id}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 16,
                  marginRight: 6,
                  marginBottom: 6,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                }}>
                <Text style={{color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500'}}>
                  {g.name}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Overview section card */}
        <View
          style={{
            backgroundColor: '#1c1c1e',
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            marginBottom: 16,
          }}>
          <Text style={{fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 6}}>
            Overview
          </Text>
          <Text style={{fontSize: 14, lineHeight: 22, color: 'rgba(255,255,255,0.8)'}}>
            {movie.overview || 'No synopsis available for this movie.'}
          </Text>
        </View>
      </View>
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
