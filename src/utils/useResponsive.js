import { useWindowDimensions } from 'react-native';

export const TABLET_MIN_WIDTH = 600;

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const minDimension = Math.min(width, height);
  const isTablet = minDimension >= TABLET_MIN_WIDTH;
  const isTabletLandscape = isTablet && isLandscape;
  const isTabletPortrait = isTablet && !isLandscape;

  // Grid sizing helpers
  const gridItemDimension = isTablet ? 190 : 120;
  const cardImageHeight = isTablet ? 260 : 180;

  return {
    width,
    height,
    isLandscape,
    isTablet,
    isTabletLandscape,
    isTabletPortrait,
    gridItemDimension,
    cardImageHeight,
  };
};

export default useResponsive;
