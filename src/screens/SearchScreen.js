import {Image, Pressable, ScrollView, Text, View} from 'react-native';
import React, {Component} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Appbar, Badge, Searchbar} from 'react-native-paper';
import {MovieDb} from 'moviedb-promise';
import {FlatGrid} from 'react-native-super-grid';
import {useNavigation} from '@react-navigation/native';

const moviedb = new MovieDb('a2df3d1a7611194432bbdf1fc80540f2');

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);

  const [page, setPage] = React.useState(1);

  const navigation = useNavigation();

  const search = async reset => {
    const res = await moviedb.searchMulti({
      query: searchQuery,
      page: page,
    });

    const r = res.results
      .map(item => {
        if (item.media_type === 'person') {
          return false;
        }
        const backdrop = item.backdrop_path || item.poster_path || null;
        return {
          id: item.id,
          title: item.title || item.name,
          image: backdrop
            ? `https://image.tmdb.org/t/p/w500/${backdrop}`
            : 'https://t3.ftcdn.net/jpg/02/68/55/60/360_F_268556012_c1WBaKFN5rjRxR2eyV33znK4qnYeKZjm.jpg',
          type: item.media_type,
          year:
            item.release_date?.split('-')[0] ||
            item.first_air_date?.split('-')[0],
          rate: item.vote_average,
        };
      })
      .filter(Boolean);
    if (reset) {
      setSearchResults(r);
    } else {
      setSearchResults([...searchResults, ...r]);
    }
  };

  return (
    <SafeAreaView style={{paddingBottom: 50}}>
      <Appbar.Header>
        <Searchbar
          placeholder="Search"
          autoFocus
          autoCapitalize="none"
          onChangeText={setSearchQuery}
          onSubmitEditing={async () => {
            setPage(1);
            setSearchResults([]);
            await search(true);
          }}
        />
      </Appbar.Header>
      <FlatGrid
        data={searchResults}
        onEndReached={() => {
          setPage(page + 1);
          search();
        }}
        renderItem={({item}) => {
          return <RenderCard item={item} />;
        }}
        itemDimension={160}
        contentContainerStyle={{alignContent: 'center'}}
      />
    </SafeAreaView>
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
          width: 160,
          borderWidth: 1,
          borderRadius: 5,
          borderColor: 'rgba(153, 153, 153, 0.2)',
          justifyContent: 'center', // Center vertically
        }}>
        <Image
          source={{
            uri: item.image,
          }}
          style={{width: '100%', height: 200}}
        />
        <Text
          style={{
            padding: 5,
            overflow: 'scroll',
            height: 50,
            textAlignVertical: 'center',
          }}>
          {item.title} ({item.year})
        </Text>

        <Badge
          style={{
            backgroundColor: 'orange',
            position: 'absolute',
            right: 5,
            top: 5,
          }}>
          {item.rate}
        </Badge>
      </View>
    </Pressable>
  );
};

export default SearchScreen;
