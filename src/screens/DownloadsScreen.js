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
        updatedAt: item.updatedAt || 0,
      });
    }
    const group = groups.get(id);
    group.episodes.push(item);
    group.updatedAt = Math.max(group.updatedAt, item.updatedAt || 0);
  });

  return [...groups.values()]
    .map(group => ({
      ...group,
      episodes: group.episodes.sort(
        (a, b) =>
          (a.season || 0) - (b.season || 0) || (a.episode || 0) - (b.episode || 0),
      ),
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
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

const RowActions = ({item, onPlay, onPause, onResume, onDelete, theme}) => (
  <View style={{flexDirection: 'row', alignItems: 'center', marginLeft: 6}}>
    <Action icon="play" label="Play" onPress={onPlay} />
    {isRunning(item) ? (
      <Action icon="pause" label="Pause" onPress={onPause} />
    ) : item.status === 'paused' || item.status === 'error' ? (
      <Action
        icon="play-circle-outline"
        label="Resume"
        onPress={onResume}
        color={theme.colors.primary}
      />
    ) : null}
    <Action icon="delete-outline" label="Delete" onPress={onDelete} />
  </View>
);

const EpisodeRow = ({item, theme, onPlay, onPause, onResume, onDelete}) => (
  <View style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 4}}>
    {item.still ? (
      <Image
        source={{uri: item.still}}
        style={{width: 56, height: 34, borderRadius: 4, marginRight: 8}}
      />
    ) : null}
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
      onPlay={onPlay}
      onPause={onPause}
      onResume={onResume}
      onDelete={onDelete}
    />
  </View>
);

const MovieCard = ({item, theme, onPlay, onPause, onResume, onDelete}) => (
  <Card style={{margin: 5}}>
    <View style={{flexDirection: 'row', padding: 8}}>
      {item.poster ? (
        <Image
          source={{uri: item.poster}}
          style={{width: 60, height: 90, borderRadius: 6}}
        />
      ) : null}
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
        onPlay={onPlay}
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
                onPause={() => onPause(item)}
                onResume={() => onResume(item)}
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
    <>
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
      <Portal>
        <Dialog visible={!!confirming} onDismiss={() => setConfirming(null)}>
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
    </>
  );
};

export default DownloadsScreen;
