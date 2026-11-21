import * as React from 'react';
import {View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {moviedb} from '../movieDb';
import {Headline, IconButton} from 'react-native-paper';
import useResponsive from '../utils/useResponsive';
import MediaGrid from '../components/MediaGrid';
import { SafeAreaView } from 'react-native-safe-area-context';

const TopRatedMoviesScreen = () => {
  const [movies, setMovies] = React.useState([]);
  const [page, setPage] = React.useState(1);

  const navigation = useNavigation();
  const {isTablet} = useResponsive();

  const mapMovie = item => ({
    id: item.id,
    title: item.title,
    poster_path: item.poster_path,
    vote_average: item.vote_average,
    image: item.poster_path
      ? `https://image.tmdb.org/t/p/w500/${item.poster_path}`
      : `https://image.tmdb.org/t/p/w500/${item.backdrop_path}`,
    year: item.release_date ? item.release_date.split('-')[0] : '',
  });

  React.useEffect(() => {
    const tm = moviedb.movieTopRated({page: page});
    tm.then(res => {
      const m = (res.results || []).map(mapMovie);
      setMovies(m);
    });
  }, []);

  const fetchMore = async () => {
    const tm = await moviedb.movieTopRated({page: page + 1});
    const newMovies = (tm.results || []).map(mapMovie);

    setMovies([...movies, ...newMovies]);
    setPage(page + 1);
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#121212'}} edges={['top', 'left', 'right']}>
      <View
        style={{
          paddingHorizontal: isTablet ? 16 : 8,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        <IconButton icon="arrow-left" iconColor="#fff" size={24} onPress={() => navigation.goBack()} />
        <Headline style={{fontSize: isTablet ? 24 : 18, fontWeight: 'bold', marginLeft: 4, color: '#fff'}}>
          Top Rated Movies
        </Headline>
      </View>
      <MediaGrid data={movies} type="movie" onEndReached={fetchMore} />
    </SafeAreaView>
  );
};

export default TopRatedMoviesScreen;
