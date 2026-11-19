import React, { useState } from 'react';
import { View, Image, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon } from 'react-native-paper';

export const MediaCard = ({
  item,
  cardWidth,
  imageHeight,
  isTablet = false,
  showTypeBadge = true,
  onPress,
}) => {
  const navigation = useNavigation();
  const [imageError, setImageError] = useState(false);

  if (!item) return null;

  const defaultWidth = isTablet ? 175 : 140;
  const defaultHeight = isTablet ? 250 : 200;
  const width = cardWidth || defaultWidth;
  const height = imageHeight || defaultHeight;

  // Determine media type
  const mediaType = item.type || (item.season != null || item.number_of_seasons ? 'tv' : 'movie');

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (mediaType === 'tv') {
      navigation.navigate('SerieDetail', { serie: item, id: item.id });
    } else {
      navigation.navigate('MovieDetail', { movie: item, id: item.id });
    }
  };

  // Calculate progress for continue watching if available
  let progressRatio = 0;
  if (item.time != null && item.duration != null && item.duration > 0) {
    progressRatio = Math.min(Math.max(item.time / item.duration, 0.05), 1);
  } else if (item.time != null && item.time > 0) {
    // If duration not recorded, assume ~20%
    progressRatio = 0.25;
  }

  // Fallback poster URI
  const posterUri =
    !imageError && item.image
      ? item.image
      : item.poster_path
      ? `https://image.tmdb.org/t/p/w500/${item.poster_path}`
      : item.backdrop_path
      ? `https://image.tmdb.org/t/p/w500/${item.backdrop_path}`
      : null;

  const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : null;
  const year = item.year || (item.release_date ? item.release_date.split('-')[0] : item.first_air_date ? item.first_air_date.split('-')[0] : '');

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { width, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}>
      <View style={[styles.cardSurface, { width }]}>
        {/* Poster Image Container */}
        <View style={[styles.posterWrapper, { height }]}>
          {posterUri ? (
            <Image
              source={{ uri: posterUri }}
              style={styles.posterImage}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.fallbackBox}>
              <Icon source={mediaType === 'tv' ? 'television-classic' : 'movie-roll'} size={36} color="#666" />
            </View>
          )}

          {/* Floating Rating Badge */}
          {rating && rating > 0 && (
            <View style={styles.ratingBadge}>
              <Text style={styles.starText}>★</Text>
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
          )}

          {/* Media Type Tag (TV / Movie) */}
          {showTypeBadge && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{mediaType === 'tv' ? 'SERIES' : 'MOVIE'}</Text>
            </View>
          )}

          {/* Continue Watching Progress Bar */}
          {progressRatio > 0 && (
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progressRatio * 100}%` }]} />
            </View>
          )}
        </View>

        {/* Card Title & Meta Info */}
        <View style={styles.infoContainer}>
          <Text numberOfLines={1} style={styles.titleText}>
            {item.title || item.name || 'Untitled'}
          </Text>
          <View style={styles.metaRow}>
            {year ? <Text style={styles.yearText}>{year}</Text> : null}
            <View style={styles.hdTag}>
              <Text style={styles.hdText}>HD</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 6,
  },
  cardSurface: {
    borderRadius: 12,
    backgroundColor: '#1c1c1e',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  posterWrapper: {
    width: '100%',
    backgroundColor: '#141416',
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  fallbackBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#202024',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.4)',
  },
  starText: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 3,
  },
  ratingText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  typeText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  progressBarBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E50914',
  },
  infoContainer: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  titleText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yearText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11,
    fontWeight: '500',
  },
  hdTag: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  hdText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 9,
    fontWeight: 'bold',
  },
});

export default MediaCard;
