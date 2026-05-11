import { Image, Pressable, ScrollView, View } from 'react-native';
import React, { Component } from 'react';
import { jsdom } from 'jsdom-jscore-rn';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Badge, Text, IconButton, ActivityIndicator } from 'react-native-paper';
import ReactNativeAnimatedSearchbox from 'react-native-animated-searchbox';
import { MovieDb } from 'moviedb-promise';
import { FlatGrid } from 'react-native-super-grid';
import { useNavigation } from '@react-navigation/native';
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
  const [totalPages, setTotalPages] = React.useState(null);
  const [totalResults, setTotalResults] = React.useState(null);
  const flatRef = React.useRef(null);
  const [scrollOffset, setScrollOffset] = React.useState(0);
  const [lastQuery, setLastQuery] = React.useState('');

  const navigation = useNavigation();

  const search = async (reset, overridePage, overrideQuery) => {
    const p = overridePage ?? page;
    const q = overrideQuery ?? searchQuery;
    console.log('[search] start', { reset, overridePage, overrideQuery, usingPage: p, usingQuery: q, statePage: page, stateQuery: searchQuery });
    setSearchLoading(true);
    try {
      const res = await moviedb.searchMulti({
        query: q,
        page: p,
      });

      console.log('[search] tmdb response meta', {
        total_results: res.total_results,
        total_pages: res.total_pages,
        raw_results_length: (res.results || []).length,
      });
      setTotalPages(res.total_pages || 1);
      setTotalResults(res.total_results || 0);
      if (res.results && res.results.length) {
        const types = res.results.reduce((acc, it) => {
          acc[it.media_type] = (acc[it.media_type] || 0) + 1;
          return acc;
        }, {});
        console.log('[search] tmdb result media types sample', types, 'sampleIds', res.results.slice(0,5).map(r=>({id:r.id, type:r.media_type, title:r.title||r.name}))); 
      } else {
        console.log('[search] tmdb returned no raw results for this page');
      }

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
        console.log('[search] reset results length', r.length);
        setSearchResults(r);
      } else {
        console.log('[search] append results length', r.length);
        setSearchResults(prev => [...prev, ...r]);
        // After appending, restore previous scroll offset to avoid jump-to-top
        setTimeout(() => {
          try {
            if (flatRef.current && typeof flatRef.current.scrollToOffset === 'function') {
              console.log('[search] restoring scroll offset', scrollOffset);
              flatRef.current.scrollToOffset({ offset: scrollOffset, animated: false });
            }
          } catch (e) {
            console.warn('[search] failed to restore scroll offset', e && (e.message || e));
          }
        }, 50);
      }
    } catch (e) {
      console.error('[search] error', e && (e.message || e), e && e.stack ? e.stack : e);
    } finally {
      setSearchLoading(false);
    }
  };
  // Clear suggestion when user is typing or hasn't searched
  React.useEffect(() => {
    if (!hasSearched || !searchQuery || searchQuery.trim().length === 0) {
      setSuggestion(null);
    }
  }, [searchQuery, hasSearched]);

  const fetchSuggestion = async q => {
    let cancelled = false;
    setSuggestionLoading(true);
    console.log('[suggestion] fetchSuggestion start', { q });
    try {
      const url = `https://search.yahoo.com/search?p=${encodeURIComponent(q)}`;
      console.log('[suggestion] fetching URL', url);
      const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      console.log('[suggestion] response status', resp && resp.status);
      const html = await resp.text();
      console.log('[suggestion] fetched html length', html ? html.length : 0);
      // parse with jsdom-jscore-rn using the same `jsdom` helper pattern as SubtitleManager
      let dom;
      let doc = null;
      try {
        dom = jsdom(html);
        if (!dom) {
          console.error('[suggestion] jsdom-jscore-rn: jsdom returned falsy dom');
          return null;
        }

        if (dom.querySelector) {
          doc = dom;
        } else if (dom.window && dom.window.document) {
          doc = dom.window.document;
        } else if (dom.document) {
          doc = dom.document;
        }

        if (!doc) {
          console.error('[suggestion] unable to obtain document from parsed DOM', Object.keys(dom || {}));
          return null;
        }
      } catch (parseErr) {
        console.error('[suggestion] JSDOM parse error', parseErr && (parseErr.message || parseErr));
        return null;
      }
      // Try a few selectors matching Yahoo's suggestion area (h4 first)
      let el = doc.querySelector('ol.reg.searchSuperTop h4.text-module.u-strong');
      console.log('[suggestion] querySelector primary', !!el);
      if (!el) el = doc.querySelector('.searchSuperTop h4');
      console.log('[suggestion] querySelector .searchSuperTop h4', !!el);
      if (!el) el = doc.querySelector('h4.text-module.u-strong');
      console.log('[suggestion] querySelector fallback h4.text-module.u-strong', !!el);

      let text = null;
      if (el) {
        text = el.textContent.trim();
        console.log('[suggestion] extracted text from h4', text);
      } else {
        // Fallback: look for <strong><i> inside .compTitle
        try {
          let strongI = doc.querySelector('.compTitle .stxt a strong i');
          console.log('[suggestion] .compTitle .stxt a strong i', !!strongI);
          if (!strongI) strongI = doc.querySelector('.compTitle .stxt a strong');
          console.log('[suggestion] .compTitle .stxt a strong', !!strongI);
          if (!strongI) {
            strongI = doc.querySelector('.compTitle .stxt a');
            console.log('[suggestion] .compTitle .stxt a', !!strongI);
          }

          if (strongI) {
            text = strongI.textContent.trim();
            console.log('[suggestion] extracted text from compTitle strong/i', text);
          }
        } catch (ex) {
          console.warn('[suggestion] compTitle fallback error', ex);
        }
      }

      // sanitize suggestion: remove common trailing qualifiers like "(film series)"
      if (text && typeof text === 'string') {
        text = text.replace(/\(film series\)/i, '').trim();
      }
      if (!cancelled) setSuggestion(text);
      return text;
    } finally {
      if (!cancelled) {
        setSuggestionLoading(false);
        console.log('[suggestion] fetchSuggestion finished, suggestionLoading=false');
      }
    }
  };

  return (
    <SafeAreaView style={{ paddingBottom: 50 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => {
            navigation.goBack();
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
              const isNew = lastQuery !== searchQuery;
              setPage(1);
              setHasSearched(true);
              setLastQuery(searchQuery);
              // If query changed, reset results; otherwise append
              const reset = isNew;
              // Run TMDB search and suggestion fetch in parallel
              await Promise.all([search(reset, 1, searchQuery), fetchSuggestion(searchQuery)]);
            }}
            focusAfterOpened={true}
            onOpened={() => { }}
          />
        </View>
      </View>
      {/* Suggestion hint shown after a search, above results (hide if suggestion equals query) */}
      {hasSearched && suggestion && suggestion.trim().toLowerCase() !== (searchQuery || '').trim().toLowerCase() ? (
        <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
          <Pressable
            onPress={async () => {
              const isNew = lastQuery !== suggestion;
              setSearchQuery(suggestion);
              setHasSearched(true);
              setPage(1);
              setLastQuery(suggestion);
              const reset = isNew;
              await Promise.all([search(reset, 1, suggestion), fetchSuggestion(suggestion)]);
            }}
            style={{ padding: 8 }}>
            <Text style={{ color: '#666' }}>See also <Text style={{ color: '#1a73e8' }}>{suggestion}</Text>?</Text>
          </Pressable>
        </View>
      ) : null}
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
                  const isNew = lastQuery !== suggestion;
                  setSearchQuery(suggestion);
                  setHasSearched(true);
                  setPage(1);
                  setLastQuery(suggestion);
                  const reset = isNew;
                  await search(reset, 1, suggestion);
                }}
                style={{ padding: 8 }}>
                <Text style={{ fontSize: 18, color: '#1a73e8' }}>{suggestion}</Text>
              </Pressable>
              <Text style={{ fontSize: 14, color: '#666', marginTop: 12 }}>
                Or search for "{searchQuery}" anyway
              </Text>
              <Pressable
                onPress={async () => {
                  const isNew = lastQuery !== searchQuery;
                  setHasSearched(true);
                  setPage(1);
                  setLastQuery(searchQuery);
                  const reset = isNew;
                  await search(reset, 1, searchQuery);
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
            console.log('[onEndReached] fired', { page, totalPages, searchLoading, searchQuery });
            if (searchLoading) {
              console.log('[onEndReached] aborting because searchLoading=true');
              return;
            }
            if (totalPages != null && page >= totalPages) {
              console.log('[onEndReached] no more pages (page>=totalPages)', { page, totalPages });
              return;
            }
            setPage(prev => {
              const next = prev + 1;
              console.log('[onEndReached] setPage prev/next', { prev, next });
              search(false, next, searchQuery);
              return next;
            });
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
