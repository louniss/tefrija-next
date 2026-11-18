import React, {useMemo, useState} from 'react';
import {FlatList, Image, View} from 'react-native';
import {
  Button,
  Caption,
  Card,
  Dialog,
  IconButton,
  Portal,
  ProgressBar,
  Subheading,
  Text,
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
        (a, b) => (a.season || 0) - (b.season || 0) || (a.episode || 0) - (b.episode || 0),
      ),
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
};

const episodeLabel = item =>
  item.season != null && item.episode != null
    ? `S${String(item.season).padStart(2, '0')}E${String(item.episode).padStart(2, '0')}`
    : '';

const DownloadsScreen = ({navigation}) => {
  const downloads = useStreamStore(state => state.downloads);
  const removeStream = useStreamStore(state => state.removeStream);
  const pauseDownload = useStreamStore(state => state.pauseDownload);
  const resumeDownload = useStreamStore(state => state.resumeDownload);
  const [expanded, setExpanded] = useState({});
  const [confirming, setConfirming] = useState(null);

  const groups = useMemo(
    () => buildGroups(sortDownloads(downloads)),
    [downloads],
  );

  const play = item => {
    const parent = navigation && navigation.getParent();
    const target = parent || navigation;
    target.navigate('VideoPlayer', {
      type: item.type,
      id: item.id,
      season: item.season,
      episode: item.episode,
    });
  };

  const remove = async item => {
    removeStream(item.key);
    try {
      await clearStreamFiles(item.key);
    } catch (e) {
      console.log('could not delete files', item.key, e.message);
    }
  };

  const EpisodeRow = ({item}) => (
    <View style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 6}}>
      {item.still ? (
        <Image
          source={{uri: item.still}}
          style={{width: 64, height: 40, borderRadius: 4, marginRight: 10}}
        />
      ) : null}
      <View style={{flex: 1}}>
        <Text numberOfLines={1}>
          {episodeLabel(item)} {item.episodeTitle || ''}
        </Text>
        <Caption>{statusLabel(item)}</Caption>
        <ProgressBar
          progress={item.status === 'completed' ? 1 : percentOf(item) / 100}
          color={item.status === 'error' ? 'red' : undefined}
        />
      </View>
      <IconButton icon="play" size={20} onPress={() => play(item)} />
      {isRunning(item) ? (
        <IconButton
          icon="pause"
          size={20}
          onPress={() => pauseDownload(item.key)}
        />
      ) : item.status === 'paused' || item.status === 'error' ? (
        <IconButton
          icon="play-circle-outline"
          size={20}
          onPress={() => resumeDownload(item.key)}
        />
      ) : null}
      <IconButton
        icon="delete"
        size={20}
        onPress={() => setConfirming(item)}
      />
    </View>
  );

  const MovieCard = ({item}) => (
    <Card style={{margin: 5}}>
      <View style={{flexDirection: 'row', padding: 8}}>
        {item.poster ? (
          <Image
            source={{uri: item.poster}}
            style={{width: 70, height: 105, borderRadius: 6}}
          />
        ) : null}
        <View style={{flex: 1, paddingLeft: 10}}>
          <Subheading numberOfLines={2}>{item.title || item.key}</Subheading>
          {item.year ? <Caption>{item.year}</Caption> : null}
          <Text style={{fontSize: 12, paddingBottom: 6}}>
            {statusLabel(item)}
          </Text>
          <ProgressBar
            progress={item.status === 'completed' ? 1 : percentOf(item) / 100}
            color={item.status === 'error' ? 'red' : undefined}
          />
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <IconButton icon="play" size={20} onPress={() => play(item)} />
          {isRunning(item) ? (
            <IconButton
              icon="pause"
              size={20}
              onPress={() => pauseDownload(item.key)}
            />
          ) : item.status === 'paused' || item.status === 'error' ? (
            <IconButton
              icon="play-circle-outline"
              size={20}
              onPress={() => resumeDownload(item.key)}
            />
          ) : null}
          <IconButton
            icon="delete"
            size={20}
            onPress={() => setConfirming(item)}
          />
        </View>
      </View>
    </Card>
  );

  const SerieCard = ({group}) => {
    const isOpen = !!expanded[group.id];
    const downloaded = group.episodes.filter(
      item => item.status === 'completed',
    ).length;
    const overall = group.episodes.reduce(
      (sum, item) => sum + (item.status === 'completed' ? 1 : percentOf(item) / 100),
      0,
    );
    return (
      <Card style={{margin: 5}}>
        <View style={{flexDirection: 'row', padding: 8, alignItems: 'center'}}>
          {group.poster ? (
            <Image
              source={{uri: group.poster}}
              style={{width: 55, height: 82, borderRadius: 6}}
            />
          ) : null}
          <View style={{flex: 1, paddingLeft: 10}}>
            <Subheading numberOfLines={2}>{group.title}</Subheading>
            <Caption>
              {downloaded} of {group.episodes.length} episode
              {group.episodes.length === 1 ? '' : 's'} downloaded
            </Caption>
            <ProgressBar progress={overall / group.episodes.length} />
          </View>
          <IconButton
            icon={isOpen ? 'chevron-up' : 'chevron-down'}
            size={22}
            onPress={() =>
              setExpanded(current => ({...current, [group.id]: !isOpen}))
            }
          />
        </View>
        {isOpen ? (
          <View style={{paddingHorizontal: 10, paddingBottom: 6}}>
            {group.episodes.map(item => (
              <EpisodeRow key={item.key} item={item} />
            ))}
          </View>
        ) : null}
      </Card>
    );
  };

  const renderGroup = ({item}) =>
    item.type === 'tv' ? (
      <SerieCard group={item} />
    ) : (
      <MovieCard item={item.episodes[0]} />
    );

  return (
    <>
      <FlatList
        data={groups}
        keyExtractor={item => item.id}
        renderItem={renderGroup}
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
        <Dialog
          visible={!!confirming}
          onDismiss={() => setConfirming(null)}>
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
