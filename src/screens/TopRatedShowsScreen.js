import * as React from 'react';
import {View} from 'react-native';
import {FlatGrid} from 'react-native-super-grid';
import {useNavigation} from '@react-navigation/native';

import {moviedb} from '../movieDb';
import {Headline, IconButton} from 'react-native-paper';
import useResponsive from '../utils/useResponsive';
import MediaCard from '../components/MediaCard';

const TopRatedShowsScreen = () => {
  const [series, setSeries] = React.useState([]);
  const [page, setPage] = React.useState(1);

  const navigation = useNavigation();
  const {isTablet} = useResponsive();

  const mapShow = item => ({
    id: item.id,
    title: item.name,
    poster_path: item.poster_path,
    vote_average: item.vote_average,
    image: item.poster_path
      ? `https://image.tmdb.org/t/p/w500/${item.poster_path}`
      : `https://image.tmdb.org/t/p/w500/${item.backdrop_path}`,
    year: item.first_air_date ? item.first_air_date.split('-')[0] : '',
  });

  React.useEffect(() => {
    const ts = moviedb.tvTopRated({page: page});
    ts.then(res => {
      const s = (res.results || []).map(mapShow);
      setSeries(s);
    });
  }, []);

  const fetchMore = async () => {
    const ts = await moviedb.tvTopRated({
      page: page + 1,
    });
    const newSeries = (ts.results || []).map(mapShow);

    setSeries([...series, ...newSeries]);
    setPage(page + 1);
  };

  return (
    <View style={{flex: 1, backgroundColor: '#121212'}}>
      <View
        style={{
          paddingHorizontal: isTablet ? 16 : 8,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        <IconButton icon="arrow-left" iconColor="#fff" size={24} onPress={() => navigation.goBack()} />
        <Headline style={{fontSize: isTablet ? 24 : 18, fontWeight: 'bold', marginLeft: 4, color: '#fff'}}>
          Top Rated Series
        </Headline>
      </View>
      <FlatGrid
        onEndReached={fetchMore}
        itemDimension={isTablet ? 180 : 130}
        data={series}
        spacing={isTablet ? 14 : 8}
        renderItem={({item}) => <MediaCard item={{...item, type: 'tv'}} isTablet={isTablet} />}
      />
    </View>
  );
};

export default TopRatedShowsScreen;
