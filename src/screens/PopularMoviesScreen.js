import * as React from 'react';
import {View, Image, Pressable} from 'react-native';
import {FlatGrid} from 'react-native-super-grid';
import {useNavigation} from '@react-navigation/native';

import {moviedb} from '../movieDb';
import useMainState from '../state/Main';
import {Headline, IconButton, Text} from 'react-native-paper';
import useResponsive from '../utils/useResponsive';

const PopularMoviesScreen = () => {
  const [movies, setMovies] = React.useState([]);
  const [page, setPage] = React.useState(1);

  const state = useMainState();
  const navigation = useNavigation();
  const {isTablet} = useResponsive();

  const mapMovie = item => ({
    id: item.id,
    title: item.title,
    image: item.poster_path
      ? `https://image.tmdb.org/t/p/w500/${item.poster_path}`
      : `https://image.tmdb.org/t/p/w500/${item.backdrop_path}`,
    year: item.release_date ? item.release_date.split('-')[0] : '',
  });

  React.useEffect(() => {
    const m = moviedb.discoverMovie({sort_by: 'popularity.desc', page: page});
    m.then(res => {
      const m = (res.results || []).map(mapMovie);
      setMovies(m);
    });
  }, []);

  const fetchMore = async () => {
    const m = await moviedb.discoverMovie({
      sort_by: 'popularity.desc',
      page: page + 1,
    });
    const newMovies = (m.results || []).map(mapMovie);

    setMovies([...movies, ...newMovies]);
    setPage(page + 1);
  };

  return (
    <View style={{flex: 1}}>
      <View
        style={{
          paddingHorizontal: isTablet ? 16 : 8,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        <Headline style={{fontSize: isTablet ? 24 : 18, fontWeight: 'bold', marginLeft: 4}}>
          Popular Movies
        </Headline>
      </View>
      <FlatGrid
        onEndReached={fetchMore}
        itemDimension={isTablet ? 180 : 120}
        data={movies}
        spacing={isTablet ? 14 : 10}
        renderItem={({item}) => <RenderCard item={{...item, type: 'movie'}} isTablet={isTablet} />}
      />
    </View>
  );
};

const RenderCard = ({item, isTablet}) => {
  const navigation = useNavigation();
  const imageHeight = isTablet ? 260 : 200;

  return (
    <Pressable
      onPress={() => {
        navigation.navigate('MovieDetail', {movie: item});
      }}>
      <View
        style={{
          borderWidth: 1,
          borderRadius: 8,
          borderColor: 'rgba(153, 153, 153, 0.2)',
          overflow: 'hidden',
        }}>
        <Image
          source={{
            uri: item.image,
          }}
          style={{width: '100%', height: imageHeight, borderTopLeftRadius: 7, borderTopRightRadius: 7}}
          resizeMode="cover"
        />
        <View style={{padding: 6, height: 48, justifyContent: 'center'}}>
          <Text
            numberOfLines={2}
            style={{
              textAlign: 'center',
              fontSize: 13,
              lineHeight: 18,
            }}>
            {item.title} {item.year ? `(${item.year})` : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

export default PopularMoviesScreen;
