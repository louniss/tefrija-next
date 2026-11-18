import React from 'react';
import {FlatList, Image, View} from 'react-native';
import {
  Button,
  Caption,
  Card,
  IconButton,
  ProgressBar,
  Subheading,
  Text,
} from 'react-native-paper';

import useStreamStore, {sortDownloads} from '../stream/store';
import {clearStreamFiles} from '../stream/manager';

const statusLabel = item => {
  switch (item.status) {
    case 'downloading':
      return item.total
        ? `Downloading ${item.done}/${item.total}`
        : 'Preparing…';
    case 'queued':
      return 'Queued';
    case 'completed':
      return 'Downloaded — plays offline';
    case 'error':
      return `Failed: ${item.error || 'unknown error'}`;
    default:
      return item.status;
  }
};

const DownloadsScreen = ({navigation}) => {
  const downloads = useStreamStore(state => state.downloads);
  const removeStream = useStreamStore(state => state.removeStream);
  const items = sortDownloads(downloads);

  const remove = async item => {
    removeStream(item.key);
    try {
      await clearStreamFiles(item.key);
    } catch (e) {
      console.log('could not delete files', item.key, e.message);
    }
  };

  const resume = item =>
    useStreamStore.getState().setDownload(item.key, {status: 'queued'});

  const renderItem = ({item}) => {
    const progress = item.total ? item.done / item.total : 0;
    return (
      <Card style={{margin: 5}}>
        <View style={{flexDirection: 'row', padding: 8}}>
          {item.poster ? (
            <Image
              source={{uri: item.poster}}
              style={{width: 70, height: 105, borderRadius: 6}}
            />
          ) : null}
          <View style={{flex: 1, paddingLeft: 10}}>
            <Subheading numberOfLines={2}>
              {item.title || item.key}
            </Subheading>
            {item.type === 'tv' ? (
              <Caption>
                Season {item.season} · Episode {item.episode}
              </Caption>
            ) : item.year ? (
              <Caption>{item.year}</Caption>
            ) : null}
            <Text style={{fontSize: 12, paddingBottom: 6}}>
              {statusLabel(item)}
            </Text>
            <ProgressBar
              progress={item.status === 'completed' ? 1 : progress}
              color={item.status === 'error' ? 'red' : undefined}
            />
          </View>
          <View>
            {item.status === 'error' ? (
              <IconButton icon="refresh" size={20} onPress={() => resume(item)} />
            ) : null}
            <IconButton
              icon="delete"
              size={20}
              onPress={() => remove(item)}
            />
          </View>
        </View>
      </Card>
    );
  };

  return (
    <FlatList
      data={items}
      keyExtractor={item => item.key}
      renderItem={renderItem}
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
  );
};

export default DownloadsScreen;
