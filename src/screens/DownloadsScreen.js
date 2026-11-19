import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, Image, TouchableOpacity, View} from 'react-native';
import {
  Button,
  Caption,
  Card,
  Dialog,
  Icon,
  Portal,
  ProgressBar,
  Subheading,
  Text,
  useTheme,
} from 'react-native-paper';

import useStreamStore, {sortDownloads} from '../stream/store';
import {clearStreamFiles} from '../stream/manager';
import useResponsive from '../utils/useResponsive';

const percentOf = item =>
  item.total ? Math.min(100, Math.round((item.done / item.total) * 100)) : 0;

const statusLabel = item => {
  switch (item.status) {
    case 'downloading':
      return item.total ? `Downloading ${percentOf(item)}%` : 'Preparing…';
    case 'queued':
      return `Queued${item.total ? ` · ${percentOf(item)}%` : ''}`;
    case 'paused':
      return `Paused · ${percentOf(item)}%`;
    case 'completed':
      return item.skipped
        ? `Downloaded · ${item.skipped} chunk${
            item.skipped === 1 ? '' : 's'
          } unavailable, skipped`
        : 'Downloaded — plays offline';
    case 'error':
      return `Failed: ${item.error || 'unknown error'}`;
    default:
      return item.status;
  }
};

const isRunning = item =>
  item.status === 'downloading' || item.status === 'queued';

const episodeLabel = item =>
  item.season != null && item.episode != null
    ? `S${String(item.season).padStart(2, '0')}E${String(item.episode).padStart(2, '0')}`
    : '';

/**
 * Which rows belong together: a movie on its own, a series grouped so a whole
 * season reads as one list.
 */
const buildGroups = items => {
  const groups = new Map();
  items.forEach(item => {
    const id = item.type === 'tv' ? `tv:${item.id}` : item.key;
    if (!groups.has(id)) {
      groups.set(id, {
        id,
        type: item.type,
        title: item.title || item.key,
        poster: item.poster,
        year: item.year,
        episodes: [],
        updatedAt: 0,
      });
    }
    const group = groups.get(id);
    group.episodes.push(item);
    // Order is fixed when a download is added; progress updates must not
    // reshuffle the list under the user's finger.
    group.createdAt = Math.min(
      group.createdAt == null ? Infinity : group.createdAt,
      item.createdAt || item.updatedAt || 0,
    );
    // The show's name belongs to the show, not to the row that happens to sort
    // first: take it from the most recent entry, so a stale title on an old
    // episode cannot title the whole group.
    if ((item.updatedAt || 0) >= (group.updatedAt || 0)) {
      group.updatedAt = item.updatedAt || 0;
      group.title = item.title || group.title;
      group.poster = item.poster || group.poster;
      group.year = item.year || group.year;
    }
  });

  return [...groups.values()]
    .map(group => ({
      ...group,
      episodes: group.episodes.sort(
        (a, b) =>
          (a.season || 0) - (b.season || 0) || (a.episode || 0) - (b.episode || 0),
      ),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Small square touch target: the default `IconButton` reserves ~72dp each,
 * which left no room for the episode title.
 */
const Action = ({icon, onPress, label, color}) => (
  <TouchableOpacity
    accessibilityLabel={label}
    accessibilityRole="button"
    onPress={onPress}
    hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
    style={{
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
    <Icon source={icon} size={20} color={color} />
  </TouchableOpacity>
);

/** Thumbnail that plays on tap: the play affordance lives on the artwork. */
const PlayThumbnail = ({uri, onPlay, width, height, radius = 6}) => (
  <TouchableOpacity
    onPress={onPlay}
    accessibilityLabel="Play"
    accessibilityRole="button"
    style={{
      width,
      height,
      borderRadius: radius,
      overflow: 'hidden',
      backgroundColor: '#222',
    }}>
    {uri ? (
      <Image source={{uri}} style={{width, height}} />
    ) : (
      <View style={{flex: 1, backgroundColor: '#333'}} />
    )}
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: 'rgba(0,0,0,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon source="play" size={16} color="#fff" />
      </View>
    </View>
  </TouchableOpacity>
);

const RowActions = ({item, onPause, onResume, onDelete, theme}) => (
  <View style={{flexDirection: 'row', alignItems: 'center', marginLeft: 6}}>
    {isRunning(item) ? (
      <Action icon="pause" label="Pause" onPress={onPause} />
    ) : item.status === 'paused' || item.status === 'error' ? (
      <Action
        icon="download"
        label="Resume download"
        onPress={onResume}
        color={theme.colors.primary}
      />
    ) : null}
    <Action icon="delete-outline" label="Delete" onPress={onDelete} />
  </View>
);

const EpisodeRow = ({item, theme, onPlay, onPause, onResume, onDelete}) => (
  <View style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 4}}>
    <View style={{marginRight: 8}}>
      <PlayThumbnail
        uri={item.still}
        onPlay={onPlay}
        width={64}
        height={38}
        radius={4}
      />
    </View>
    <View style={{flex: 1}}>
      <Text numberOfLines={1} style={{fontSize: 13}}>
        {episodeLabel(item)} {item.episodeTitle || ''}
      </Text>
      <Caption numberOfLines={1} style={{fontSize: 11}}>
        {statusLabel(item)}
      </Caption>
      <ProgressBar
        progress={item.status === 'completed' ? 1 : percentOf(item) / 100}
        color={item.status === 'error' ? theme.colors.error : undefined}
        style={{height: 3, borderRadius: 2}}
      />
    </View>
    <RowActions
      item={item}
      theme={theme}
      onPause={onPause}
      onResume={onResume}
      onDelete={onDelete}
    />
  </View>
);

const MovieCard = ({item, theme, onPlay, onPause, onResume, onDelete}) => (
  <Card style={{margin: 5}}>
    <View style={{flexDirection: 'row', padding: 8}}>
      <PlayThumbnail uri={item.poster} onPlay={onPlay} width={60} height={90} />
      <View style={{flex: 1, paddingLeft: 10, justifyContent: 'center'}}>
        <Subheading numberOfLines={2}>{item.title || item.key}</Subheading>
        {item.year ? <Caption>{item.year}</Caption> : null}
        <Text style={{fontSize: 12, paddingBottom: 6}}>{statusLabel(item)}</Text>
        <ProgressBar
          progress={item.status === 'completed' ? 1 : percentOf(item) / 100}
          color={item.status === 'error' ? theme.colors.error : undefined}
          style={{height: 3, borderRadius: 2}}
        />
      </View>
      <RowActions
        item={item}
        theme={theme}
        onPause={onPause}
        onResume={onResume}
        onDelete={onDelete}
      />
    </View>
  </Card>
);

const SerieCard = ({
  group,
  isOpen,
  theme,
  onToggle,
  onPlay,
  onPause,
  onResume,
  onDelete,
}) => {
  const downloaded = group.episodes.filter(
    item => item.status === 'completed',
  ).length;
  const overall = group.episodes.reduce(
    (sum, item) =>
      sum + (item.status === 'completed' ? 1 : percentOf(item) / 100),
    0,
  );

  return (
    <Card style={{margin: 5}}>
      <TouchableOpacity
        onPress={onToggle}
        accessibilityRole="button"
        style={{flexDirection: 'row', padding: 8, alignItems: 'center'}}>
        {group.poster ? (
          <Image
            source={{uri: group.poster}}
            style={{width: 48, height: 72, borderRadius: 6}}
          />
        ) : null}
        <View style={{flex: 1, paddingLeft: 10}}>
          <Subheading numberOfLines={2}>{group.title}</Subheading>
          <Caption>
            {downloaded} of {group.episodes.length} episode
            {group.episodes.length === 1 ? '' : 's'} downloaded
          </Caption>
          <ProgressBar
            progress={overall / group.episodes.length}
            style={{height: 3, borderRadius: 2}}
          />
        </View>
        <View style={{width: 34, alignItems: 'center'}}>
          <Icon source={isOpen ? 'chevron-up' : 'chevron-down'} size={22} />
        </View>
      </TouchableOpacity>
      {isOpen
        ? group.episodes.map(item => (
            <View key={item.key} style={{paddingHorizontal: 10, paddingBottom: 4}}>
              <EpisodeRow
                item={item}
                theme={theme}
                onPlay={() => onPlay(item)}
                onPause={() => onPause(item.key)}
                onResume={() => onResume(item.key)}
                onDelete={() => onDelete(item)}
              />
            </View>
          ))
        : null}
    </Card>
  );
};

const DownloadsScreen = ({navigation}) => {
  const downloads = useStreamStore(state => state.downloads);
  const removeStream = useStreamStore(state => state.removeStream);
  const pauseDownload = useStreamStore(state => state.pauseDownload);
  const resumeDownload = useStreamStore(state => state.resumeDownload);
  const theme = useTheme();
  const [expanded, setExpanded] = useState({});
  const [confirming, setConfirming] = useState(null);
  const { isTablet } = useResponsive();

  const groups = useMemo(
    () => buildGroups(sortDownloads(downloads)),
    [downloads],
  );

  const play = useCallback(
    item => {
      const parent = navigation && navigation.getParent();
      (parent || navigation).navigate('VideoPlayer', {
        type: item.type,
        id: item.id,
        season: item.season,
        episode: item.episode,
      });
    },
    [navigation],
  );

  const pause = useCallback(key => pauseDownload(key), [pauseDownload]);
  const resume = useCallback(key => resumeDownload(key), [resumeDownload]);
  const confirmDelete = useCallback(item => setConfirming(item), []);
  const toggle = useCallback(
    id => setExpanded(current => ({...current, [id]: !current[id]})),
    [],
  );

  const remove = async item => {
    removeStream(item.key);
    try {
      await clearStreamFiles(item.key);
    } catch (e) {
      console.log('could not delete files', item.key, e.message);
    }
  };

  const renderGroup = ({item}) =>
    item.type === 'tv' ? (
      <SerieCard
        group={item}
        isOpen={!!expanded[item.id]}
        theme={theme}
        onToggle={() => toggle(item.id)}
        onPlay={play}
        onPause={pause}
        onResume={resume}
        onDelete={confirmDelete}
      />
    ) : (
      <MovieCard
        item={item.episodes[0]}
        theme={theme}
        onPlay={() => play(item.episodes[0])}
        onPause={() => pause(item.episodes[0].key)}
        onResume={() => resume(item.episodes[0].key)}
        onDelete={() => confirmDelete(item.episodes[0])}
      />
    );

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: isTablet ? 900 : undefined,
          alignSelf: 'center',
          paddingHorizontal: isTablet ? 16 : 0,
        }}>
        <FlatList
          data={groups}
          keyExtractor={item => item.id}
          renderItem={renderGroup}
          extraData={expanded}
          ListEmptyComponent={
            <View style={{padding: 20}}>
              <Caption>
                Nothing downloaded yet. Use the download button on a movie or an
                episode.
              </Caption>
            </View>
          }
          ListFooterComponent={
            navigation ? (
              <Button
                style={{margin: 10}}
                mode="text"
                onPress={() => navigation.navigate('Home')}>
                Browse
              </Button>
            ) : null
          }
        />
      </View>
      <Portal>
        <Dialog
          visible={!!confirming}
          onDismiss={() => setConfirming(null)}
          style={{ maxWidth: 500, width: '90%', alignSelf: 'center' }}>
          <Dialog.Title>Delete download?</Dialog.Title>
          <Dialog.Content>
            <Text>
              {confirming
                ? `${confirming.title || confirming.key}${
                    confirming.episode ? ` — ${episodeLabel(confirming)}` : ''
                  }`
                : ''}
            </Text>
            <Caption>The downloaded files will be removed from the device.</Caption>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirming(null)}>Cancel</Button>
            <Button
              onPress={() => {
                const item = confirming;
                setConfirming(null);
                remove(item);
              }}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

export default DownloadsScreen;
