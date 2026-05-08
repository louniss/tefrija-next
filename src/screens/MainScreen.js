import * as React from 'react';
import {View, Image, ScrollView, Pressable, FlatList} from 'react-native';
import {FlatGrid} from 'react-native-super-grid';
import {useNavigation} from '@react-navigation/native';

import {moviedb} from '../movieDb';
import useMainState from '../state/Main';
import {Badge, Button, Headline, IconButton, Text} from 'react-native-paper';

import Carousel from 'react-native-reanimated-carousel';
import {Dimensions} from 'react-native';
import Animated from 'react-native-reanimated';

const {width} = Dimensions.get('window');

export const MainScreen = () => {
  const [movies, setMovies] = React.useState([]);
  const [series, setSeries] = React.useState([]);
  const [topRatedMovies, setTopRatedMovies] = React.useState([]);
  const [topRatedSeries, setTopRatedSeries] = React.useState([]);

  const [continueWatching, setContinueWatching] = React.useState([]);

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
      const m = res.results.map(item => {
        return {
          id: item.id,
          title: item.title,
          image: `https://image.tmdb.org/t/p/w500/${item.backdrop_path}`,
          imageLarge: `https://image.tmdb.org/t/p/w780/${item.poster_path}`,
          year: item.release_date.split('-')[0],
          imdb_id: item.imdb_id,
        };
      });

      setMovies(m);
    });

    const s = moviedb.discoverTv({sort_by: 'popularity.desc'});
    s.then(res => {
      const s = res.results.map(item => {
        return {
          id: item.id,
          title: item.name,
          image: `https://image.tmdb.org/t/p/w500/${item.backdrop_path}`,
          imageLarge: `https://image.tmdb.org/t/p/w780/${item.backdrop_path}`,
          year: item.first_air_date.split('-')[0],
        };
      });

      setSeries(s);
    });

    const tm = moviedb.movieTopRated({});
    tm.then(res => {
      const m = res.results.map(item => {
        return {
          id: item.id,
          title: item.title,
          image: `https://image.tmdb.org/t/p/w500/${item.poster_path}`,
          year: item.release_date.split('-')[0],
        };
      });

      setTopRatedMovies(m);
    });

    const ts = moviedb.tvTopRated({});
    ts.then(res => {
      const s = res.results.map(item => {
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

  return (
    <ScrollView>
      <Carousel
        data={movies}
        width={width}
        height={500}
        autoPlay={false}
        panGestureHandlerProps={{
          activeOffsetX: [-10, 20],
        }}
        mode="horizontal-stack"
        modeConfig={{
          showLength: 3,
        }}
        renderItem={({item}) => {
          return (
            <Pressable
              onPress={() => {
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
                  height: 480,
                  borderRadius: 10,
                }}
                sharedTransitionTag="movie-image"
              />
            </Pressable>
          );
        }}
      />
      {continueWatching.length > 0 && <Headline>Continue Watching</Headline>}
      <FlatList
        horizontal={true}
        data={continueWatching}
        renderItem={({item}) => <RenderCard item={item} />}
      />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <Headline>Popular Movies</Headline>
        <Button onPress={() => navigation.navigate('PopularMovies')}>
          more
        </Button>
      </View>
      <FlatList
        horizontal
        data={movies}
        renderItem={({item}) => <RenderCard item={{...item, type: 'movie'}} />}
      />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <Headline>Popular Series</Headline>
        <Button onPress={() => navigation.navigate('PopularShows')}>
          more
        </Button>
      </View>
      <FlatList
        horizontal
        data={series}
        renderItem={({item}) => <RenderCard item={{...item, type: 'tv'}} />}
      />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <Headline>Top Rated Movies</Headline>
        <Button onPress={() => navigation.navigate('TopRatedMovies')}>
          more
        </Button>
      </View>
      <FlatList
        horizontal
        data={topRatedMovies}
        renderItem={({item}) => <RenderCard item={{...item, type: 'movie'}} />}
      />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <Headline>Top Rated Series</Headline>
        <Button onPress={() => navigation.navigate('TopRatedShows')}>
          more
        </Button>
      </View>
      <FlatList
        horizontal
        data={topRatedSeries}
        renderItem={({item}) => <RenderCard item={{...item, type: 'tv'}} />}
      />
    </ScrollView>
  );
};

const RenderCard = ({item}) => {
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
          width: 151,
          borderWidth: 1,
          borderRadius: 5,
          borderColor: 'rgba(153, 153, 153, 0.2)',
          margin: 5,
          justifyContent: 'center', // Center vertically
        }}>
        <Image
          source={{
            uri: item.image,
          }}
          style={{width: 149, height: 200, borderRadius: 5}}
        />
        <Text
          style={{
            padding: 5,
            overflow: 'scroll',
            height: 60,
            textAlignVertical: 'center',
          }}>
          {item.title} ({item.year})
        </Text>
      </View>
    </Pressable>
  );
};
