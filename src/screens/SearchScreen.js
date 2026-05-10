import { Image, Pressable, ScrollView, View } from 'react-native';
import React, { Component } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Badge, Text, IconButton, ActivityIndicator } from 'react-native-paper';
import ReactNativeAnimatedSearchbox from 'react-native-animated-searchbox';
import { MovieDb } from 'moviedb-promise';
import { FlatGrid } from 'react-native-super-grid';
import { useNavigation } from '@react-navigation/native';
import { JSDOM } from 'jsdom';
const moviedb = new MovieDb('a2df3d1a7611194432bbdf1fc80540f2');

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const refSearchBox = React.useRef();
  const [searchResults, setSearchResults] = React.useState([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [suggestion, setSuggestion] = React.useState(null);
  const [suggestionLoading, setSuggestionLoading] = React.useState(false);

  const [page, setPage] = React.useState(1);

  const navigation = useNavigation();

  const search = async (reset, overridePage) => {
    const p = overridePage ?? page;
    setSearchLoading(true);
    try {
      const res = await moviedb.searchMulti({
        query: searchQuery,
        page: p,
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
        setSearchResults(prev => [...prev, ...r]);
      }
    } catch (e) {
      // ignore
    } finally {
      setSearchLoading(false);
    }
  };

  // Try to fetch a "did you mean" suggestion from Yahoo when no results
  React.useEffect(() => {
    let cancelled = false;
    if (!hasSearched || !searchQuery || searchQuery.trim().length === 0) {
      setSuggestion(null);
      return;
    }

    const fetchSuggestion = async q => {
      setSuggestionLoading(true);
      try {
        const url = `https://search.yahoo.com/search?p=${encodeURIComponent(q)}`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await resp.text();
        // parse with jsdom-jscore-rn
        const dom = new JSDOM(html);
        const doc = dom.window.document;
        debugger
        // Try a few selectors matching Yahoo's suggestion area
        let el = doc.querySelector('ol.reg.searchSuperTop h4.text-module.u-strong');
        if (!el) el = doc.querySelector('.searchSuperTop h4');
        if (!el) el = doc.querySelector('h4.text-module.u-strong');
        const text = el ? el.textContent.trim() : null;
        return text;
      } catch (e) {
        return null;
      } finally {
        if (!cancelled) setSuggestionLoading(false);
      }
    };

    (async () => {
      setSuggestion(null);
      const s = await fetchSuggestion(searchQuery);
      if (!cancelled) setSuggestion(s);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchQuery, hasSearched]);

  return (
    <SafeAreaView style={{ paddingBottom: 50 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
        <IconButton
          icon="menu"
          size={24}
          onPress={() => {
            navigation.openDrawer();
          }}
          style={{ margin: 0 }}
        />
        <View style={{ flex: 1 }}>
          <ReactNativeAnimatedSearchbox
            ref={refSearchBox}
            placeholder={"Search..."}
            value={searchQuery}
            onChangeText={text => {
              setSearchQuery(text);
              setHasSearched(false);
              if (text.trim().length === 0) {
                setSearchResults([]);
                setPage(1);
              }
            }}
            onSubmitEditing={async () => {
              setPage(1);
              setSearchResults([]);
              setHasSearched(true);
              await search(true, 1);
            }}
            focusAfterOpened={true}
            onOpened={() => { }}
          />
        </View>
      </View>
      {searchQuery.trim().length === 0 ? (
        <View style={{ padding: 30, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
            Start typing to search movies and shows
          </Text>
        </View>
      ) : searchLoading ? (
        <View style={{ padding: 30, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator animating={true} />
        </View>
      ) : hasSearched && searchResults.length === 0 ? (
        <View style={{ padding: 30, alignItems: 'center', justifyContent: 'center' }}>
          {suggestionLoading ? (
            <ActivityIndicator animating={true} />
          ) : suggestion ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 8 }}>
                Did you mean:
              </Text>
              <Pressable
                onPress={async () => {
                  setSearchQuery(suggestion);
                  setHasSearched(true);
                  setPage(1);
                  setSearchResults([]);
                  await search(true, 1);
                }}
                style={{ padding: 8 }}>
                <Text style={{ fontSize: 18, color: '#1a73e8' }}>{suggestion}</Text>
              </Pressable>
              <Text style={{ fontSize: 14, color: '#666', marginTop: 12 }}>
                Or search for "{searchQuery}" anyway
              </Text>
              <Pressable
                onPress={async () => {
                  setHasSearched(true);
                  setPage(1);
                  setSearchResults([]);
                  await search(true, 1);
                }}
                style={{ padding: 8 }}>
                <Text style={{ color: '#666' }}>Search</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
                No results for "{searchQuery}".
              </Text>
            </View>
          )}
        </View>
      ) : searchResults.length > 0 ? (
        <FlatGrid
          data={searchResults}
          onEndReached={() => {
            if (searchLoading) return;
            const next = page + 1;
            setPage(next);
            search(false, next);
          }}
          renderItem={({ item }) => {
            return <RenderCard item={item} />;
          }}
          itemDimension={160}
          contentContainerStyle={{ alignContent: 'center' }}
        />
      ) : (
        <View style={{ padding: 30, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
            Press Enter to search
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const RenderCard = ({ item }) => {
  const navigation = useNavigation();

  return (
      <Pressable
        onPress={() => {
        if (item.type === 'movie') {
          navigation.navigate('Home', { screen: 'MovieDetail', params: { movie: item, fromSearch: true } });
        } else {
          navigation.navigate('Home', { screen: 'SerieDetail', params: { serie: item, fromSearch: true } });
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
          style={{ width: '100%', height: 200 }}
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
