import * as React from 'react';
import {FlatList, StyleSheet, useWindowDimensions, View} from 'react-native';

import MediaCard from './MediaCard';
import useResponsive from '../utils/useResponsive';
import {measureGrid} from '../utils/mediaGridLayout';

const MediaGrid = React.forwardRef(
  (
    {
      data,
      type,
      onPressItem,
      ListEmptyComponent,
      ListFooterComponent,
      keyExtractor,
      ...rest
    },
    ref,
  ) => {
    const {width: windowWidth} = useWindowDimensions();
    const {isTablet} = useResponsive();
    const [containerWidth, setContainerWidth] = React.useState(0);

    const layout = React.useMemo(
      () => measureGrid(containerWidth || windowWidth, isTablet),
      [containerWidth, windowWidth, isTablet],
    );

    const onLayout = event => {
      const next = event.nativeEvent.layout.width;
      setContainerWidth(prev => (Math.abs(prev - next) > 0.5 ? next : prev));
    };

    return (
      <View style={styles.container} onLayout={onLayout}>
        <FlatList
          key={`media-grid-${layout.columns}`}
          ref={ref}
          {...rest}
          data={data}
          numColumns={layout.columns}
          keyExtractor={
            keyExtractor ||
            ((item, index) =>
              item?.type && item?.id
                ? `${item.type}-${item.id}`
                : String(item?.id ?? index))
          }
          columnWrapperStyle={
            layout.columns > 1
              ? {gap: layout.gap, justifyContent: 'center'}
              : undefined
          }
          contentContainerStyle={{padding: layout.padding, gap: layout.gap}}
          renderItem={({item}) => (
            <MediaCard
              item={type ? {...item, type} : item}
              cardWidth={layout.cardWidth}
              imageHeight={layout.imageHeight}
              cardMargin={0}
              isTablet={isTablet}
              onPress={onPressItem ? () => onPressItem(item) : undefined}
            />
          )}
          ListEmptyComponent={ListEmptyComponent}
          ListFooterComponent={ListFooterComponent}
        />
      </View>
    );
  },
);

MediaGrid.displayName = 'MediaGrid';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default MediaGrid;
