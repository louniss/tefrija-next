import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useResponsive from '../utils/useResponsive';

const TABS = [
  {
    key: 'home',
    label: 'Home',
    icon: 'home-variant',
    action: (navigation) => navigation.navigate('Home', { screen: 'Main' }),
  },
  {
    key: 'search',
    label: 'Search',
    icon: 'magnify',
    action: (navigation) => navigation.navigate('Search'),
  },
  {
    key: 'downloads',
    label: 'Downloads',
    icon: 'download',
    action: (navigation) => navigation.navigate('Downloads'),
  },
  {
    key: 'more',
    label: 'More',
    icon: 'menu',
    action: (navigation) => {
      if (typeof navigation.openDrawer === 'function') {
        navigation.openDrawer();
      }
    },
  },
];

export const MobileBottomNav = ({ activeTab = 'home' }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isTabletLandscape } = useResponsive();

  // On tablet landscape, the permanent drawer is docked on the left
  if (isTabletLandscape) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      <View style={styles.navBar}>
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          const activeColor = '#E50914';
          const inactiveColor = '#808080';

          return (
            <Pressable
              key={tab.key}
              onPress={() => tab.action(navigation)}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.1)', borderless: true, radius: 28 }}
              style={styles.tabItem}>
              {isActive && <View style={styles.activePillIndicator} />}
              <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                <Icon
                  source={tab.icon}
                  size={22}
                  color={isActive ? activeColor : inactiveColor}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? '#FFFFFF' : inactiveColor,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#141414',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  navBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  activePillIndicator: {
    position: 'absolute',
    top: -4,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#E50914',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
  },
  activeIconContainer: {
    transform: [{ scale: 1.05 }],
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 2,
    letterSpacing: 0.2,
  },
});

export default MobileBottomNav;
