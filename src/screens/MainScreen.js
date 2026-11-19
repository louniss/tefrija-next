import * as React from 'react';
import {
  View,
  Image,
  ScrollView,
  Pressable,
  FlatList,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {moviedb} from '../movieDb';
import useMainState from '../state/Main';
import {Button, Headline, IconButton, Text} from 'react-native-paper';

import Carousel from 'react-native-reanimated-carousel';
import Animated from 'react-native-reanimated';
import useResponsive from '../utils/useResponsive';

const CarouselCard = ({item}) => {
  const navigation = useNavigation();
  const startX = React.useRef(0);
  const moved = React.useRef(false);

  return (
    <Pressable
      onTouchStart={e => {
        startX.current = e.nativeEvent.pageX;
        moved.current = false;
      }}
      onTouchMove={e => {
        const dx = Math.abs(e.nativeEvent.pageX - startX.current);
        if (dx > 10) moved.current = true;
      }}
      onPress={() => {
        if (moved.current) return;
        item.type = 'movie';
        navigation.navigate('MovieDetail', {movie: item});
      }}
      key={item.id}
      style={{
        flex: 1,
        alignContent: 'center',
        alignItems: 'center',
        marginTop: 5,
      }}>
      <Animated.Image
        source={{
          uri: item.imageLarge,
        }}
        style={{
          width: '90%',
          height: 500,
          borderRadius: 10,
        }}
        sharedTransitionTag="movie-image"
      />
    </Pressable>
  );
};

const TabletHeroCard = ({item, cardWidth, cardHeight}) => {
  const navigation = useNavigation();

  return (
    <Pressable
      onPress={() => {
        item.type = 'movie';
        navigation.navigate('MovieDetail', {movie: item});
      }}
      style={{
        width: cardWidth,
        height: cardHeight,
        paddingHorizontal: 16,
        paddingVertical: 6,
      }}>
      <View
        style={{
          flex: 1,
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: '#1a1a1a',
        }}>
        <Image
          source={{
            uri: item.backdropLarge || item.imageLarge,
          }}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
          }}
          resizeMode="cover"
        />
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.35)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '60%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: 24,
            justifyContent: 'center',
          }}>
          <Text
            numberOfLines={2}
            style={{
              color: '#ffffff',
              fontSize: 26,
              fontWeight: 'bold',
              marginBottom: 8,
              textShadowColor: 'rgba(0,0,0,0.8)',
              textShadowOffset: {width: 1, height: 1},
              textShadowRadius: 4,
            }}>
            {item.title}
          </Text>

          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
            {item.vote_average ? (
              <View
                style={{
                  backgroundColor: '#f59e0b',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 12,
                  marginRight: 8,
                }}>
                <Text style={{color: '#000', fontWeight: 'bold', fontSize: 12}}>
                  ★ {Number(item.vote_average).toFixed(1)}
                </Text>
              </View>
            ) : null}
            {item.year ? (
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 12,
                  marginRight: 8,
                }}>
                <Text style={{color: '#fff', fontSize: 12}}>{item.year}</Text>
              </View>
            ) : null}
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
              }}>
              <Text style={{color: '#fff', fontSize: 12, fontWeight: 'bold'}}>HD</Text>
            </View>
          </View>

          {item.overview ? (
            <Text
              numberOfLines={3}
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: 14,
                lineHeight: 20,
                marginBottom: 16,
              }}>
              {item.overview}
            </Text>
          ) : null}

          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Button
              mode="contained"
              icon="play"
              onPress={() => {
                navigation.navigate('VideoPlayer', {
                  type: 'movie',
                  id: item.id,
                  imdbId: item.imdb_id,
                });
              }}
              style={{marginRight: 10, borderRadius: 8}}>
              Play
            </Button>
            <Button
              mode="contained-tonal"
              icon="information-outline"
              onPress={() => {
                item.type = 'movie';
                navigation.navigate('MovieDetail', {movie: item});
              }}
              style={{borderRadius: 8}}>
              Details
            </Button>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export const MainScreen = () => {
  const [movies, setMovies] = React.useState([]);
  const [series, setSeries] = React.useState([]);
  const [topRatedMovies, setTopRatedMovies] = React.useState([]);
  const [topRatedSeries, setTopRatedSeries] = React.useState([]);

  const [continueWatching, setContinueWatching] = React.useState([]);

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const {width, height, isTablet, isTabletLandscape} = useResponsive();
  const contentWidth = isTabletLandscape ? width - 220 : width;
  const cardWidth = isTablet ? 175 : 151;
  const imageHeight = isTablet ? 250 : 200;
  const heroHeight = isTablet ? Math.min(Math.round(height * 0.46), 380) : 550;

  const state = useMainState();
  const navigation = useNavigation();

  React.useEffect(() => {
    state.init().then(s => {
      setContinueWatching(s.continueWatching);
    });
  }, []);

  React.useEffect(() => {
    setContinueWatching(state.continueWatching);
  }, [state.continueWatching]);

  React.useEffect(() => {
    const m = moviedb.discoverMovie({sort_by: 'popularity.desc'});
    m.then(res => {
      const m = (res.results || []).map(item => {
        return {
          id: item.id,
          title: item.title,
          overview: item.overview,
          vote_average: item.vote_average,
          backdrop_path: item.backdrop_path,
          poster_path: item.poster_path,
          image: item.poster_path
            ? `https://image.tmdb.org/t/p/w500/${item.poster_path}`
            : `https://image.tmdb.org/t/p/w500/${item.backdrop_path}`,
          imageLarge: `https://image.tmdb.org/t/p/w780/${item.poster_path}`,
          backdropLarge: item.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280/${item.backdrop_path}`
            : `https://image.tmdb.org/t/p/w780/${item.poster_path}`,
          year: item.release_date ? item.release_date.split('-')[0] : '',
          imdb_id: item.imdb_id,
        };
      });

      setMovies(m);
    });

    const s = moviedb.discoverTv({sort_by: 'popularity.desc'});
    s.then(res => {
      const s = (res.results || []).map(item => {
        return {
          id: item.id,
          title: item.name,
          overview: item.overview,
          vote_average: item.vote_average,
          backdrop_path: item.backdrop_path,
          poster_path: item.poster_path,
          image: item.poster_path
            ? `https://image.tmdb.org/t/p/w500/${item.poster_path}`
            : `https://image.tmdb.org/t/p/w500/${item.backdrop_path}`,
          imageLarge: `https://image.tmdb.org/t/p/w780/${item.poster_path}`,
          backdropLarge: item.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280/${item.backdrop_path}`
            : `https://image.tmdb.org/t/p/w780/${item.poster_path}`,
          year: item.first_air_date ? item.first_air_date.split('-')[0] : '',
        };
      });

      setSeries(s);
    });

    const tm = moviedb.movieTopRated({});
    tm.then(res => {
      const m = (res.results || []).map(item => {
        return {
          id: item.id,
          title: item.title,
          image: `https://image.tmdb.org/t/p/w500/${item.poster_path}`,
          year: item.release_date ? item.release_date.split('-')[0] : '',
        };
      });

      setTopRatedMovies(m);
    });

    const ts = moviedb.tvTopRated({});
    ts.then(res => {
      const s = (res.results || []).map(item => {
        return {
          id: item.id,
          title: item.name,
          image: `https://image.tmdb.org/t/p/w500/${item.poster_path}`,
          year: item.first_air_date?.split('-')[0],
        };
      });

      setTopRatedSeries(s);
    });
  }, []);

  const [genres, setGenres] = React.useState([]);

  React.useEffect(() => {
    let mounted = true;
    const fetchGenres = async () => {
      try {
        const gm = await moviedb.genreMovieList();
        const gt = await moviedb.genreTvList();

        const map = {};
        (gm.genres || []).forEach(g => {
          map[(g.name || '').toLowerCase()] = { name: g.name, movieId: g.id };
        });
        (gt.genres || []).forEach(g => {
          const key = (g.name || '').toLowerCase();
          if (!map[key]) map[key] = { name: g.name, tvId: g.id };
          else map[key].tvId = g.id;
        });

        const list = Object.keys(map).map(k => map[k]);
        if (mounted) setGenres(list);
      } catch (e) {
        console.warn('failed to fetch genres', e && e.message);
      }
    };

    fetchGenres();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Mobile Header (Drawer icon, Title, Search) */}
      {!isTabletLandscape && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}>
          <IconButton
            icon="menu"
            size={24}
            onPress={() => navigation.openDrawer()}
          />
          <Text style={{fontSize: 20, fontWeight: 'bold'}}>Tefrija</Text>
          <IconButton
            icon="magnify"
            size={24}
            onPress={() => navigation.navigate('Search')}
          />
        </View>
      )}

      {/* Hero Carousel */}
      {movies.length > 0 && (
        isTablet ? (
          <Carousel
            data={movies.slice(0, 8)}
            width={contentWidth}
            height={heroHeight}
            autoPlay={false}
            renderItem={({item}) => (
              <TabletHeroCard
                item={item}
                cardWidth={contentWidth}
                cardHeight={heroHeight}
              />
            )}
          />
        ) : (
          <Carousel
            data={movies}
            width={contentWidth}
            height={550}
            autoPlay={false}
            panGestureHandlerProps={{
              activeOffsetX: [-10, 20],
            }}
            mode="horizontal-stack"
            modeConfig={{
              showLength: 3,
            }}
            renderItem={({item}) => <CarouselCard item={item} />}
          />
        )
      )}

      {continueWatching.length > 0 && (
        <View style={{paddingHorizontal: isTablet ? 16 : 8, paddingTop: 12}}>
          <Headline style={{fontSize: isTablet ? 22 : 18, fontWeight: 'bold'}}>Continue Watching</Headline>
        </View>
      )}
      {continueWatching.length > 0 && (
        <FlatList
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal: isTablet ? 12 : 6}}
          data={continueWatching}
          renderItem={({item}) => <RenderCard item={item} cardWidth={cardWidth} imageHeight={imageHeight} />}
        />
      )}

      {/* Genres section */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: isTablet ? 16 : 8,
          paddingTop: 12,
        }}>
        <Headline style={{fontSize: isTablet ? 22 : 18, fontWeight: 'bold'}}>Genres</Headline>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ paddingVertical: 8 }}
        contentContainerStyle={{ paddingHorizontal: isTablet ? 16 : 8 }}>
        {genres.map(g => (
          <Pressable
            key={g.name}
            onPress={() => {
              navigation.navigate('MoviesShowsByGenre', { genre: g });
            }}
            style={{
              paddingHorizontal: isTablet ? 16 : 12,
              paddingVertical: isTablet ? 8 : 7,
              borderRadius: 20,
              backgroundColor: isDarkMode ? '#2c2c2c' : '#e5e5e5',
              marginRight: 8,
            }}>
            <Text style={{ color: isDarkMode ? '#fff' : '#000', fontSize: isTablet ? 14 : 13 }}>
              {g.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Popular Movies */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: isTablet ? 16 : 8,
          paddingTop: 8,
        }}>
        <Headline style={{fontSize: isTablet ? 22 : 18, fontWeight: 'bold'}}>Popular Movies</Headline>
        <Button onPress={() => navigation.navigate('PopularMovies')}>
          more
        </Button>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: isTablet ? 12 : 6}}
        data={movies}
        renderItem={({item}) => <RenderCard item={{...item, type: 'movie'}} cardWidth={cardWidth} imageHeight={imageHeight} />}
      />

      {/* Popular Series */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: isTablet ? 16 : 8,
          paddingTop: 8,
        }}>
        <Headline style={{fontSize: isTablet ? 22 : 18, fontWeight: 'bold'}}>Popular Series</Headline>
        <Button onPress={() => navigation.navigate('PopularShows')}>
          more
        </Button>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: isTablet ? 12 : 6}}
        data={series}
        renderItem={({item}) => <RenderCard item={{...item, type: 'tv'}} cardWidth={cardWidth} imageHeight={imageHeight} />}
      />

      {/* Top Rated Movies */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: isTablet ? 16 : 8,
          paddingTop: 8,
        }}>
        <Headline style={{fontSize: isTablet ? 22 : 18, fontWeight: 'bold'}}>Top Rated Movies</Headline>
        <Button onPress={() => navigation.navigate('TopRatedMovies')}>
          more
        </Button>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: isTablet ? 12 : 6}}
        data={topRatedMovies}
        renderItem={({item}) => <RenderCard item={{...item, type: 'movie'}} cardWidth={cardWidth} imageHeight={imageHeight} />}
      />

      {/* Top Rated Series */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: isTablet ? 16 : 8,
          paddingTop: 8,
        }}>
        <Headline style={{fontSize: isTablet ? 22 : 18, fontWeight: 'bold'}}>Top Rated Series</Headline>
        <Button onPress={() => navigation.navigate('TopRatedShows')}>
          more
        </Button>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: isTablet ? 12 : 6, paddingBottom: 24}}
        data={topRatedSeries}
        renderItem={({item}) => <RenderCard item={{...item, type: 'tv'}} cardWidth={cardWidth} imageHeight={imageHeight} />}
      />
    </ScrollView>
  );
};

const RenderCard = ({item, cardWidth = 151, imageHeight = 200}) => {
  const navigation = useNavigation();

  return (
    <Pressable
      onPress={() => {
        if (item.type === 'movie') {
          navigation.navigate('MovieDetail', {movie: item});
        } else {
          navigation.navigate('SerieDetail', {serie: item});
        }
      }}>
      <View
        style={{
          width: cardWidth,
          borderWidth: 1,
          borderRadius: 8,
          borderColor: 'rgba(153, 153, 153, 0.2)',
          margin: 6,
          overflow: 'hidden',
        }}>
        <Image
          source={{
            uri: item.image,
          }}
          style={{width: '100%', height: imageHeight, borderTopLeftRadius: 7, borderTopRightRadius: 7}}
          resizeMode="cover"
        />
        <View style={{padding: 8, height: 56, justifyContent: 'center'}}>
          <Text
            numberOfLines={2}
            style={{
              fontSize: 13,
              fontWeight: '500',
              lineHeight: 18,
            }}>
            {item.title} {item.year ? `(${item.year})` : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};
