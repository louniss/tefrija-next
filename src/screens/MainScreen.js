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
import { useNavigation } from '@react-navigation/native';

import { moviedb } from '../movieDb';
import useMainState from '../state/Main';
import { Button, Headline, IconButton, Text, Icon } from 'react-native-paper';

import Carousel from 'react-native-reanimated-carousel';
import Animated from 'react-native-reanimated';
import useResponsive from '../utils/useResponsive';
import MediaCard from '../components/MediaCard';
import MobileBottomNav from '../components/MobileBottomNav';

const MobileHeroCard = ({ item }) => {
  const navigation = useNavigation();
  const startX = React.useRef(0);
  const moved = React.useRef(false);

  const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : null;

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
        navigation.navigate('MovieDetail', { movie: item });
      }}
      key={item.id}
      style={{
        flex: 1,
        paddingHorizontal: 12,
        paddingTop: 4,
      }}>
      <View
        style={{
          flex: 1,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: '#181818',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 6,
        }}>
        <Image
          source={{
            uri: item.imageLarge || item.image,
          }}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
          }}
          resizeMode="cover"
        />

        {/* Gradient Overlay for bottom text legibility */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 220,
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        />

        {/* Bottom Hero Info */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: 16,
            alignItems: 'center',
          }}>
          <Text
            numberOfLines={1}
            style={{
              color: '#ffffff',
              fontSize: 22,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 6,
              textShadowColor: 'rgba(0,0,0,0.9)',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 4,
            }}>
            {item.title}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            {rating && rating > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 184, 0, 0.25)',
                  borderColor: 'rgba(255, 184, 0, 0.6)',
                  borderWidth: 1,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                  marginRight: 8,
                }}>
                <Text style={{ color: '#FFB800', fontWeight: 'bold', fontSize: 11, marginRight: 3 }}>
                  ★
                </Text>
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 11 }}>
                  {rating}
                </Text>
              </View>
            )}
            {item.year ? (
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                  marginRight: 8,
                }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '500' }}>{item.year}</Text>
              </View>
            ) : null}
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
              }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>HD</Text>
            </View>
          </View>

          {/* Action buttons row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
            <Button
              mode="contained"
              icon="play"
              buttonColor="#ffffff"
              textColor="#000000"
              style={{ flex: 1, maxWidth: 140, marginRight: 10, borderRadius: 20 }}
              contentStyle={{ height: 38 }}
              labelStyle={{ fontWeight: 'bold', fontSize: 13 }}
              onPress={() => {
                navigation.navigate('VideoPlayer', {
                  type: 'movie',
                  id: item.id,
                  imdbId: item.imdb_id,
                });
              }}>
              Play
            </Button>
            <Button
              mode="contained-tonal"
              icon="information-outline"
              buttonColor="rgba(255,255,255,0.25)"
              textColor="#ffffff"
              style={{ flex: 1, maxWidth: 140, borderRadius: 20 }}
              contentStyle={{ height: 38 }}
              labelStyle={{ fontWeight: 'bold', fontSize: 13 }}
              onPress={() => {
                item.type = 'movie';
                navigation.navigate('MovieDetail', { movie: item });
              }}>
              Details
            </Button>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const TabletHeroCard = ({ item, cardWidth, cardHeight }) => {
  const navigation = useNavigation();

  return (
    <Pressable
      onPress={() => {
        item.type = 'movie';
        navigation.navigate('MovieDetail', { movie: item });
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
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 4,
            }}>
            {item.title}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            {item.vote_average ? (
              <View
                style={{
                  backgroundColor: '#f59e0b',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 12,
                  marginRight: 8,
                }}>
                <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 12 }}>
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
                <Text style={{ color: '#fff', fontSize: 12 }}>{item.year}</Text>
              </View>
            ) : null}
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
              }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>HD</Text>
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

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
              style={{ marginRight: 10, borderRadius: 8 }}>
              Play
            </Button>
            <Button
              mode="contained-tonal"
              icon="information-outline"
              onPress={() => {
                item.type = 'movie';
                navigation.navigate('MovieDetail', { movie: item });
              }}
              style={{ borderRadius: 8 }}>
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

  const { width, height, isTablet, isTabletLandscape } = useResponsive();
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
    const m = moviedb.discoverMovie({ sort_by: 'popularity.desc' });
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

    const s = moviedb.discoverTv({ sort_by: 'popularity.desc' });
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
          poster_path: item.poster_path,
          vote_average: item.vote_average,
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
          poster_path: item.poster_path,
          vote_average: item.vote_average,
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

  const SectionHeader = ({ title, onMore }) => (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: isTablet ? 16 : 12,
        paddingTop: 18,
        paddingBottom: 8,
      }}>
      <Text style={{ fontSize: isTablet ? 22 : 18, fontWeight: 'bold', color: '#ffffff' }}>
        {title}
      </Text>
      {onMore && (
        <Pressable
          onPress={onMore}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.08)',
              opacity: pressed ? 0.7 : 1,
            },
          ]}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#E50914', marginRight: 2 }}>
            See all
          </Text>
          <Icon source="chevron-right" size={16} color="#E50914" />
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Mobile Header (Brand Logo, Drawer, Search) */}
        {!isTabletLandscape && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 12,
              paddingTop: 8,
              paddingBottom: 6,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconButton
                icon="menu"
                size={24}
                iconColor="#ffffff"
                style={{ margin: 0, marginRight: 6 }}
                onPress={() => navigation.openDrawer()}
              />
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#E50914', letterSpacing: 1 }}>
                TEFRIJA
              </Text>
            </View>
            <IconButton
              icon="magnify"
              size={22}
              iconColor="#ffffff"
              style={{ margin: 0, backgroundColor: 'rgba(255,255,255,0.1)' }}
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
              renderItem={({ item }) => (
                <TabletHeroCard
                  item={item}
                  cardWidth={contentWidth}
                  cardHeight={heroHeight}
                />
              )}
            />
          ) : (
            <Carousel
              data={movies.slice(0, 10)}
              width={contentWidth}
              height={450}
              autoPlay={false}
              panGestureHandlerProps={{
                activeOffsetX: [-10, 20],
              }}
              mode="horizontal-stack"
              modeConfig={{
                showLength: 3,
              }}
              renderItem={({ item }) => <MobileHeroCard item={item} />}
            />
          )
        )}

        {/* Continue Watching Section */}
        {continueWatching.length > 0 && (
          <SectionHeader title="Continue Watching" />
        )}
        {continueWatching.length > 0 && (
          <FlatList
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: isTablet ? 12 : 6 }}
            data={continueWatching}
            renderItem={({ item }) => (
              <MediaCard
                item={item}
                cardWidth={cardWidth}
                imageHeight={imageHeight}
                isTablet={isTablet}
              />
            )}
          />
        )}

        {/* Genres section */}
        <SectionHeader title="Genres" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingVertical: 4 }}
          contentContainerStyle={{ paddingHorizontal: isTablet ? 16 : 10 }}>
          {genres.map(g => (
            <Pressable
              key={g.name}
              onPress={() => {
                navigation.navigate('MoviesShowsByGenre', { genre: g });
              }}
              style={({ pressed }) => [{
                paddingHorizontal: isTablet ? 16 : 14,
                paddingVertical: isTablet ? 8 : 7,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
                marginRight: 8,
                opacity: pressed ? 0.75 : 1,
              }]}>
              <Text style={{ color: '#ffffff', fontSize: isTablet ? 14 : 13, fontWeight: '600' }}>
                {g.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Popular Movies */}
        <SectionHeader
          title="Popular Movies"
          onMore={() => navigation.navigate('PopularMovies')}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: isTablet ? 12 : 6 }}
          data={movies}
          renderItem={({ item }) => (
            <MediaCard
              item={{ ...item, type: 'movie' }}
              cardWidth={cardWidth}
              imageHeight={imageHeight}
              isTablet={isTablet}
            />
          )}
        />

        {/* Popular Series */}
        <SectionHeader
          title="Popular Series"
          onMore={() => navigation.navigate('PopularShows')}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: isTablet ? 12 : 6 }}
          data={series}
          renderItem={({ item }) => (
            <MediaCard
              item={{ ...item, type: 'tv' }}
              cardWidth={cardWidth}
              imageHeight={imageHeight}
              isTablet={isTablet}
            />
          )}
        />

        {/* Top Rated Movies */}
        <SectionHeader
          title="Top Rated Movies"
          onMore={() => navigation.navigate('TopRatedMovies')}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: isTablet ? 12 : 6 }}
          data={topRatedMovies}
          renderItem={({ item }) => (
            <MediaCard
              item={{ ...item, type: 'movie' }}
              cardWidth={cardWidth}
              imageHeight={imageHeight}
              isTablet={isTablet}
            />
          )}
        />

        {/* Top Rated Series */}
        <SectionHeader
          title="Top Rated Series"
          onMore={() => navigation.navigate('TopRatedShows')}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: isTablet ? 12 : 6, paddingBottom: 28 }}
          data={topRatedSeries}
          renderItem={({ item }) => (
            <MediaCard
              item={{ ...item, type: 'tv' }}
              cardWidth={cardWidth}
              imageHeight={imageHeight}
              isTablet={isTablet}
            />
          )}
        />
      </ScrollView>
      <MobileBottomNav activeTab="home" />
    </View>
  );
};
