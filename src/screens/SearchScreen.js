import { Pressable, View } from 'react-native';
import React from 'react';
import { jsdom } from 'jsdom-jscore-rn';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, IconButton, ActivityIndicator } from 'react-native-paper';
import ReactNativeAnimatedSearchbox from 'react-native-animated-searchbox';
import { MovieDb } from 'moviedb-promise';
import { useNavigation, CommonActions } from '@react-navigation/native';
import useResponsive from '../utils/useResponsive';
import MediaGrid from '../components/MediaGrid';
import MobileBottomNav from '../components/MobileBottomNav';
const moviedb = new MovieDb('a2df3d1a7611194432bbdf1fc80540f2');

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const refSearchBox = React.useRef();
  const [searchResults, setSearchResults] = React.useState([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const loadingMoreRef = React.useRef(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [suggestion, setSuggestion] = React.useState(null);
  const [suggestionLoading, setSuggestionLoading] = React.useState(false);

  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(null);
  const [totalResults, setTotalResults] = React.useState(null);
  const [lastQuery, setLastQuery] = React.useState('');

  const navigation = useNavigation();
  const { isTablet } = useResponsive();

  const search = async overrideQuery => {
    const q = (overrideQuery ?? searchQuery).trim();
    if (!q) {
      return;
    }
    console.log('[search] start fresh search', { query: q });
    setSearchLoading(true);
    setPage(1);
    try {
      const res = await moviedb.searchMulti({
        query: q,
        page: 1,
      });

      console.log('[search] tmdb response meta', {
        total_results: res.total_results,
        total_pages: res.total_pages,
        raw_results_length: (res.results || []).length,
      });
      setTotalPages(res.total_pages || 1);
      setTotalResults(res.total_results || 0);

      const r = (res.results || [])
        .map(item => {
          if (item.media_type === 'person') {
            return false;
          }
          const poster = item.poster_path || item.backdrop_path || null;
          return {
            id: item.id,
            title: item.title || item.name,
            poster_path: item.poster_path,
            vote_average: item.vote_average,
            image: poster
              ? `https://image.tmdb.org/t/p/w500/${poster}`
              : 'https://t3.ftcdn.net/jpg/02/68/55/60/360_F_268556012_c1WBaKFN5rjRxR2eyV33znK4qnYeKZjm.jpg',
            type: item.media_type,
            year:
              item.release_date?.split('-')[0] ||
              item.first_air_date?.split('-')[0],
            rate: item.vote_average,
          };
        })
        .filter(Boolean);

      const seen = new Set();
      const unique = [];
      for (const it of r) {
        const key = `${it.type}-${it.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(it);
        }
      }
      console.log('[search] unique results count', unique.length);
      setSearchResults(unique);
    } catch (e) {
      console.error('[search] error', e && (e.message || e), e && e.stack ? e.stack : e);
    } finally {
      setSearchLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMoreRef.current || searchLoading) {
      console.log('[loadMore] skipping: already loading', {
        loadingMore: loadingMoreRef.current,
        searchLoading,
      });
      return;
    }
    if (totalPages != null && page >= totalPages) {
      console.log('[loadMore] no more pages', { page, totalPages });
      return;
    }
    const q = (searchQuery || lastQuery || '').trim();
    if (!q) {
      return;
    }

    const nextPage = page + 1;
    console.log('[loadMore] fetching next page', { nextPage, query: q });
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await moviedb.searchMulti({
        query: q,
        page: nextPage,
      });

      setTotalPages(res.total_pages || 1);
      setTotalResults(res.total_results || 0);

      const r = (res.results || [])
        .map(item => {
          if (item.media_type === 'person') {
            return false;
          }
          const poster = item.poster_path || item.backdrop_path || null;
          return {
            id: item.id,
            title: item.title || item.name,
            poster_path: item.poster_path,
            vote_average: item.vote_average,
            image: poster
              ? `https://image.tmdb.org/t/p/w500/${poster}`
              : 'https://t3.ftcdn.net/jpg/02/68/55/60/360_F_268556012_c1WBaKFN5rjRxR2eyV33znK4qnYeKZjm.jpg',
            type: item.media_type,
            year:
              item.release_date?.split('-')[0] ||
              item.first_air_date?.split('-')[0],
            rate: item.vote_average,
          };
        })
        .filter(Boolean);

      setSearchResults(prev => {
        const existingKeys = new Set(prev.map(it => `${it.type}-${it.id}`));
        const newItems = r.filter(it => !existingKeys.has(`${it.type}-${it.id}`));
        console.log('[loadMore] appending items', {
          prevCount: prev.length,
          newCount: newItems.length,
        });
        return [...prev, ...newItems];
      });
      setPage(nextPage);
    } catch (e) {
      console.error('[loadMore] error', e && (e.message || e));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };
  // Open search box when screen mounts
  React.useEffect(() => {
    if (refSearchBox.current && typeof refSearchBox.current.open === 'function') {
      refSearchBox.current.open();
    }
  }, []);
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
        text = text.replace(/\(franchise\)/i, '').trim();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: isTablet ? 16 : 8,
          maxWidth: isTablet ? 800 : undefined,
          width: '100%',
          alignSelf: 'center',
        }}>
        <IconButton
          icon="arrow-left"
          iconColor="#fff"
          size={24}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }}
          style={{ margin: 0 }}
        />
        <View style={{ flex: 1, paddingTop: 8, paddingBottom: 8 }}>
          <ReactNativeAnimatedSearchbox
            ref={refSearchBox}
            focusAfterOpened={true}
            placeholder={"Search..."}
            value={searchQuery}
            onChangeText={text => {
              setSearchQuery(text);
              setHasSearched(false);
              if (text.trim().length === 0) {
                setSearchResults([]);
                setPage(1);
                setTotalPages(null);
                setTotalResults(null);
              }
            }}
            onSubmitEditing={async () => {
              setHasSearched(true);
              setLastQuery(searchQuery);
              await Promise.all([search(searchQuery), fetchSuggestion(searchQuery)]);
            }}
            onOpened={() => { }}
          />
        </View>
      </View>
      {/* Suggestion hint shown after a search, above results (hide if suggestion equals query) */}
      {hasSearched && suggestion && suggestion.trim().toLowerCase() !== (searchQuery || '').trim().toLowerCase() ? (
        <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
          <Pressable
            onPress={async () => {
              setSearchQuery(suggestion);
              setHasSearched(true);
              setLastQuery(suggestion);
              await Promise.all([search(suggestion), fetchSuggestion(suggestion)]);
            }}
            style={{ padding: 8 }}>
            <Text style={{ color: '#aaa' }}>See also <Text style={{ color: '#E50914', fontWeight: 'bold' }}>{suggestion}</Text>?</Text>
          </Pressable>
        </View>
      ) : null}
      {searchQuery.trim().length === 0 ? (
        <View style={{ padding: 30, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, color: '#888', textAlign: 'center' }}>
            Start typing to search movies and shows
          </Text>
        </View>
      ) : searchLoading ? (
        <View style={{ padding: 30, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator animating={true} color="#E50914" />
        </View>
      ) : hasSearched && searchResults.length === 0 ? (
        <View style={{ padding: 30, alignItems: 'center', justifyContent: 'center' }}>
          {suggestionLoading ? (
            <ActivityIndicator animating={true} color="#E50914" />
          ) : suggestion ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: '#aaa', textAlign: 'center', marginBottom: 8 }}>
                Did you mean:
              </Text>
              <Pressable
                onPress={async () => {
                  setSearchQuery(suggestion);
                  setHasSearched(true);
                  setLastQuery(suggestion);
                  await search(suggestion);
                }}
                style={{ padding: 8 }}>
                <Text style={{ fontSize: 18, color: '#E50914', fontWeight: 'bold' }}>{suggestion}</Text>
              </Pressable>
              <Text style={{ fontSize: 14, color: '#888', marginTop: 12 }}>
                Or search for "{searchQuery}" anyway
              </Text>
              <Pressable
                onPress={async () => {
                  setHasSearched(true);
                  setLastQuery(searchQuery);
                  await search(searchQuery);
                }}
                style={{ padding: 8 }}>
                <Text style={{ color: '#aaa' }}>Search</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Text style={{ fontSize: 16, color: '#888', textAlign: 'center' }}>
                No results for "{searchQuery}".
              </Text>
            </View>
          )}
        </View>
      ) : searchResults.length > 0 ? (
        <MediaGrid
          data={searchResults}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator animating={true} color="#E50914" />
              </View>
            ) : null
          }
          onPressItem={item => {
            if (item.type === 'movie') {
              navigation.navigate('MovieDetail', { movie: item, id: item.id });
            } else {
              navigation.navigate('SerieDetail', { serie: item, id: item.id });
            }
          }}
        />
      ) : (
        <View style={{ padding: 30, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, color: '#888', textAlign: 'center' }}>
            Press Enter to search
          </Text>
        </View>
      )}
      </View>
      <MobileBottomNav activeTab="search" />
    </SafeAreaView>
  );
};

export default SearchScreen;
