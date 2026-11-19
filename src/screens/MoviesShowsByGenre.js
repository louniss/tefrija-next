import * as React from 'react';
import { View, Pressable, Image, ScrollView } from 'react-native';
import { FlatGrid } from 'react-native-super-grid';
import { useNavigation, useRoute } from '@react-navigation/native';
import { moviedb } from '../movieDb';
import { Button, Headline, IconButton, Text, ActivityIndicator } from 'react-native-paper';
import useResponsive from '../utils/useResponsive';

const MoviesShowsByGenre = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { isTablet } = useResponsive();
  const { genre } = route.params || {};
  const [type, setType] = React.useState(genre && genre.movieId ? 'movie' : 'tv');
  const [results, setResults] = React.useState([]);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [totalPages, setTotalPages] = React.useState(null);

  const [movieGenres, setMovieGenres] = React.useState([]);
  const [tvGenres, setTvGenres] = React.useState([]);
  const [activeGenre, setActiveGenre] = React.useState(genre || null);

  const genreId = type === 'movie' ? activeGenre?.movieId : activeGenre?.tvId;

  const fetchResults = async (p = 1) => {
    if (!genreId) return;
    setLoading(true);
    try {
      const res =
        type === 'movie'
          ? await moviedb.discoverMovie({ with_genres: genreId, page: p })
          : await moviedb.discoverTv({ with_genres: genreId, page: p });

      const mapped = (res.results || []).map(item => ({
        id: item.id,
        title: item.title || item.name,
        image: item.poster_path
          ? `https://image.tmdb.org/t/p/w500/${item.poster_path}`
          : (item.backdrop_path ? `https://image.tmdb.org/t/p/w500/${item.backdrop_path}` : null),
        year: (item.release_date || item.first_air_date || '').split('-')[0],
      }));

      if (p === 1) setResults(mapped);
      else setResults(prev => [...prev, ...mapped]);
      setTotalPages(res.total_pages || 1);
    } catch (e) {
      console.warn('fetchResults error', e && e.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    setPage(1);
    fetchResults(1);
  }, [type, genreId]);

  // If no genre provided, fetch available genre lists for selection
  React.useEffect(() => {
    let mounted = true;
    const fetchGenreLists = async () => {
      try {
        const gm = await moviedb.genreMovieList();
        const gt = await moviedb.genreTvList();
        if (!mounted) return;
        setMovieGenres(gm.genres || []);
        setTvGenres(gt.genres || []);
      } catch (e) {
        console.warn('failed to fetch genre lists', e && e.message);
      }
    };

    if (!genre) fetchGenreLists();
    return () => {
      mounted = false;
    };
  }, [genre]);

  const imageHeight = isTablet ? 260 : 200;

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: isTablet ? 16 : 8,
          paddingVertical: 10,
        }}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        <Headline style={{ marginLeft: 4, fontSize: isTablet ? 24 : 20, fontWeight: 'bold' }}>
          {activeGenre?.name || genre?.name || 'Genre'}
        </Headline>
        <View style={{ flex: 1 }} />
        <Button
          mode={type === 'movie' ? 'contained' : 'text'}
          onPress={() => setType('movie')}
          disabled={!activeGenre?.movieId && !genre?.movieId}
          style={{ marginRight: 8, borderRadius: 8 }}>
          Movies
        </Button>
        <Button
          mode={type === 'tv' ? 'contained' : 'text'}
          onPress={() => setType('tv')}
          disabled={!activeGenre?.tvId && !genre?.tvId}
          style={{ borderRadius: 8 }}>
          Series
        </Button>
      </View>

      {/* If no activeGenre, show selector UI */}
      {!activeGenre ? (
        <View style={{ padding: isTablet ? 20 : 12 }}>
          <Text style={{ marginBottom: 8, fontSize: 16 }}>Choose type and genre</Text>
          <View style={{ flexDirection: 'row', marginBottom: 10 }}>
            <Button mode={type === 'movie' ? 'contained' : 'outlined'} onPress={() => setType('movie')}>
              Movies
            </Button>
            <View style={{ width: 12 }} />
            <Button mode={type === 'tv' ? 'contained' : 'outlined'} onPress={() => setType('tv')}>
              Series
            </Button>
          </View>

          <ScrollView horizontal contentContainerStyle={{ paddingVertical: 6 }}>
            {(type === 'movie' ? movieGenres : tvGenres).map(g => (
              <Pressable
                key={g.id}
                onPress={() => {
                  const unified = { name: g.name };
                  if (type === 'movie') unified.movieId = g.id;
                  else unified.tvId = g.id;
                  setActiveGenre(unified);
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: '#eee',
                  marginRight: 8,
                }}>
                <Text>{g.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : loading && page === 1 ? (
        <View style={{ padding: 30, alignItems: 'center' }}>
          <ActivityIndicator animating size="large" />
        </View>
      ) : (
        <FlatGrid
          data={results}
          itemDimension={isTablet ? 180 : 120}
          spacing={isTablet ? 14 : 10}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate(type === 'movie' ? 'MovieDetail' : 'SerieDetail', {
                  [type === 'movie' ? 'movie' : 'serie']: item,
                })
              }>
              <View
                style={{
                  borderWidth: 1,
                  borderRadius: 8,
                  borderColor: 'rgba(153,153,153,0.2)',
                  overflow: 'hidden',
                }}>
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    style={{ width: '100%', height: imageHeight, borderTopLeftRadius: 7, borderTopRightRadius: 7 }}
                    resizeMode="cover"
                  />
                ) : null}
                <View style={{ padding: 6, height: 48, justifyContent: 'center' }}>
                  <Text numberOfLines={2} style={{ textAlign: 'center', fontSize: 13, lineHeight: 18 }}>
                    {item.title} {item.year ? `(${item.year})` : ''}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
          onEndReached={() => {
            if (loading) return;
            if (totalPages != null && page >= totalPages) return;
            const next = page + 1;
            setPage(next);
            fetchResults(next);
          }}
        />
      )}
    </View>
  );
};

export default MoviesShowsByGenre;
