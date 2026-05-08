import * as React from 'react';
import {View, Text, Image, ScrollView, Pressable} from 'react-native';
import {FlatGrid} from 'react-native-super-grid';
import {useNavigation} from '@react-navigation/native';

import {moviedb} from '../movieDb';
import useMainState from '../state/Main';
import {Button, Headline, IconButton, Paragraph} from 'react-native-paper';

const PopularShowsScreen = () => {
  const [series, setSeries] = React.useState([]);
  const [page, setPage] = React.useState(1);

  const state = useMainState();
  const navigation = useNavigation();

  React.useEffect(() => {
    const s = moviedb.discoverTv({sort_by: 'popularity.desc', page: page});
    s.then(res => {
      const s = res.results.map(item => {
        return {
          id: item.id,
          title: item.name,
          image: `https://image.tmdb.org/t/p/w500/${item.backdrop_path}`,
          year: item.first_air_date.split('-')[0],
        };
      });

      setSeries(s);
    });
  }, []);

  const fetchMore = async () => {
    const s = await moviedb.discoverTv({
      sort_by: 'popularity.desc',
      page: page + 1,
    });
    const newSeries = s.results.map(item => {
      return {
        id: item.id,
        title: item.name,
        image: `https://image.tmdb.org/t/p/w500/${item.backdrop_path}`,
        year: item.first_air_date.split('-')[0],
      };
    });

    setSeries([...series, ...newSeries]);
    setPage(page + 1);
  };

  return (
    <>
      <View style={{padding: 1, flexDirection: 'row', alignItems: 'center'}}>
        <Button icon="chevron-left" onPress={() => navigation.goBack()}>
          back
        </Button>
        <Paragraph>Popular Shows</Paragraph>
      </View>
      <FlatGrid
        onEndReached={fetchMore}
        itemDimension={120}
        data={series}
        spacing={10}
        renderItem={({item}) => <RenderCard item={{...item, type: 'tv'}} />}
      />
    </>
  );
};

const RenderCard = ({item}) => {
  const navigation = useNavigation();

  return (
    <Pressable
      onPress={() => {
        navigation.navigate('SerieDetail', {serie: item});
      }}>
      <View
        style={{
          borderWidth: 1,
          borderRadius: 5,
          borderColor: 'rgba(153, 153, 153, 0.2)',
          justifyContent: 'center',
        }}>
        <Image
          source={{
            uri: item.image,
          }}
          style={{width: '100%', height: 200, borderRadius: 5}}
        />
        <Text
          style={{
            padding: 5,
            textAlign: 'center',
            height: 50,
          }}>
          {item.title} ({item.year})
        </Text>
      </View>
    </Pressable>
  );
};

export default PopularShowsScreen;
