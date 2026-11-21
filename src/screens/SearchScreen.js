import { Pressable, View } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, IconButton, ActivityIndicator } from 'react-native-paper';
import ReactNativeAnimatedSearchbox from 'react-native-animated-searchbox';
import { MovieDb } from 'moviedb-promise';
import { useNavigation, CommonActions } from '@react-navigation/native';
import useResponsive from '../utils/useResponsive';
import MediaGrid from '../components/MediaGrid';
import MobileBottomNav from '../components/MobileBottomNav';
const moviedb = new MovieDb('a2df3d1a7611194432bbdf1fc80540f2');

const STRIP_SUFFIXES = [
  /\s+cast$/i,
  /\s+movie(s)?$/i,
  /\s+tv(\s+(series|show))?$/i,
  /\s+show$/i,
  /\s+series$/i,
  /\s+episodes?$/i,
  /\s+seasons?(\s+\d+)?$/i,
  /\s+trailer$/i,
  /\s+characters?$/i,
  /\s+soundtrack$/i,
  /\s+ending( explained)?$/i,
  /\s+reviews?$/i,
  /\s+imdb$/i,
  /\s+netflix$/i,
  /\s+watch\s+online$/i,
  /\s+release\s+date$/i,
  /\s+full\s+movie$/i,
  /\(film\s*series\)/i,
  /\(franchise\)/i,
  /\(tv\s*series\)/i,
  /\(film\)/i,
  /\s+schedule$/i,
  /\s+game(s)?(\s+today)?$/i,
  /\s+score(s)?$/i,
  /\s+roster$/i,
  /\s+quarterback$/i,
  /\s+qb$/i,
  /\s+depth\s+chart$/i,
  /\s+news$/i,
  /\s+appliances$/i,
  /\s+cookware$/i,
  /\s+cruises?.*$/i,
  /\s+vs\s+.*$/i,
];

const cleanTitle = s => {
  let res = (s || '').trim();
  for (const pat of STRIP_SUFFIXES) {
    res = res.replace(pat, '').trim();
  }
  return res;
};

const extractSuggestion = (q, items) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return null;
  }
  const qLower = q.toLowerCase().trim();
  const qWords = qLower.split(/\s+/);
  const k = qWords.length;

  // 1. Any mrk === 7 (direct spell-correction / autocorrect from Yahoo)
  const spellItems = items.filter(it => it && it.mrk === 7);
  for (const it of spellItems) {
    const c = cleanTitle(it.key);
    if (c.toLowerCase() !== qLower && c.length > 1) {
      return c;
    }
  }

  // 2. Check if suggestions share an inflection / plural / prefix variation of q
  // e.g. 'viking' -> suggestions have 'vikings schedule', 'vikings cast' -> prefix is 'vikings'
  // e.g. 'peaky blinder' -> 'peaky blinders cast' -> prefix is 'peaky blinders'
  // e.g. 'stranger thing' -> 'stranger things cast' -> prefix is 'stranger things'
  const prefixCounts = {};
  for (const it of items) {
    const c = cleanTitle(it.key);
    const words = c.split(/\s+/);
    if (words.length >= k) {
      const pfx = words.slice(0, k).join(' ');
      const pfxLower = pfx.toLowerCase();
      if (pfxLower !== qLower) {
        prefixCounts[pfx] = (prefixCounts[pfx] || 0) + 1;
      }
    }
  }

  let bestPfx = null;
  let maxCount = 0;
  for (const [pfx, count] of Object.entries(prefixCounts)) {
    const pfxLower = pfx.toLowerCase();
    const isClose =
      pfxLower.startsWith(qLower) ||
      qLower.startsWith(pfxLower) ||
      Math.abs(pfxLower.length - qLower.length) <= 2;
    if (isClose && count > maxCount) {
      maxCount = count;
      bestPfx = pfx;
    }
  }
  if (bestPfx && maxCount >= 2) {
    return bestPfx;
  }

  // 3. If there is a high-ranking item whose cleaned title is an edit-distance variant of q
  for (const it of items.slice(0, 5)) {
    const c = cleanTitle(it.key);
    const cLower = c.toLowerCase();
    if (
      cLower !== qLower &&
      (cLower.startsWith(qLower) || qLower.startsWith(cLower)) &&
      Math.abs(cLower.length - qLower.length) <= 2
    ) {
      return c;
    }
  }

  return null;
};

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
    const trimmed = (q || '').trim();
    if (!trimmed) {
      setSuggestion(null);
      return null;
    }
    setSuggestionLoading(true);
    console.log('[suggestion] fetchSuggestion start', { q: trimmed });
    try {
      const primaryUrl = `https://search.yahoo.com/sugg/gossip/gossip-us-ura/?command=${encodeURIComponent(
        trimmed,
      )}&output=json&nresults=20`;
      const fallbackUrl = `https://ff.search.yahoo.com/gossip?output=json&command=${encodeURIComponent(
        trimmed,
      )}`;

      let items = [];
      try {
        const resp = await fetch(primaryUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        if (resp.ok) {
          const data = await resp.json();
          items = data?.gossip?.results || [];
        }
      } catch (err) {
        console.warn('[suggestion] primary endpoint failed, trying fallback', err);
      }

      if (!items || items.length === 0) {
        try {
          const resp = await fetch(fallbackUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
          });
          if (resp.ok) {
            const data = await resp.json();
            items = data?.gossip?.results || [];
          }
        } catch (err) {
          console.warn('[suggestion] fallback endpoint failed', err);
        }
      }

      const text = extractSuggestion(trimmed, items);
      console.log('[suggestion] extracted suggestion', text);
      setSuggestion(text);
      return text;
    } catch (e) {
      console.error('[suggestion] error', e && (e.message || e));
      setSuggestion(null);
      return null;
    } finally {
      setSuggestionLoading(false);
      console.log('[suggestion] fetchSuggestion finished, suggestionLoading=false');
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
