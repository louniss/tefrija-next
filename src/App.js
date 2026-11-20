import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { IconButton, Text } from 'react-native-paper';
import { DefaultTheme, DarkTheme, useNavigation } from '@react-navigation/native';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import { useColorScheme, View, StyleSheet, LogBox } from 'react-native';

LogBox.ignoreLogs(['Iconv-lite warning', 'Render Error: Should have a queue']);

import { MainScreen } from './screens/MainScreen';
import SearchScreen from './screens/SearchScreen';
import MovieDetail from './screens/MovieDetail';
import SerieDetails from './screens/SerieDetail';
import VideoPlayer from './screens/Player/VideoPlayer';
import AboutScreen from './screens/AboutScreen';
import UpdatesScreen from './screens/UpdatesScreen';
import PopularShowsScreen from './screens/PopularShowsScreen';
import PopularMoviesScreen from './screens/PopularMoviesScreen';
import TopRatedMoviesScreen from './screens/TopRatedMoviesScreen';
import TopRatedShowsScreen from './screens/TopRatedShowsScreen';
import MoviesShowsByGenre from './screens/MoviesShowsByGenre';
import DownloadsScreen from './screens/DownloadsScreen';
import { WebFetchHost } from './stream/webFetch';
import { DownloadHost } from './stream/DownloadHost';
import { ensureStreamServer } from './stream/server';
import useResponsive from './utils/useResponsive';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const InitialHome = () => {
  SystemNavigationBar.navigationShow();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainScreen} />
      <Stack.Screen name="MovieDetail" component={MovieDetail} />
      <Stack.Screen name="SerieDetail" component={SerieDetails} />
      <Stack.Screen name="PopularShows" component={PopularShowsScreen} />
      <Stack.Screen name="PopularMovies" component={PopularMoviesScreen} />
      <Stack.Screen name="TopRatedMovies" component={TopRatedMoviesScreen} />
      <Stack.Screen name="TopRatedShows" component={TopRatedShowsScreen} />
      <Stack.Screen name="MoviesShowsByGenre" component={MoviesShowsByGenre} />
      <Stack.Screen
        name="VideoPlayerEmbed"
        component={VideoPlayer}
        screenOptions={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

/* Search has its own stack: details opened from a result are pushed here, so
 * their back arrow pops back to the results instead of switching the drawer to
 * Home (which used to bounce between Search and the detail screen). */
const SearchStackNav = createNativeStackNavigator();

const SearchStack = () => (
  <SearchStackNav.Navigator screenOptions={{headerShown: false}}>
    <SearchStackNav.Screen name="Search" component={SearchScreen} />
    <SearchStackNav.Screen name="MovieDetail" component={MovieDetail} />
    <SearchStackNav.Screen name="SerieDetail" component={SerieDetails} />
  </SearchStackNav.Navigator>
);

const CustomDrawerContent = props => {
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{paddingTop: 8, flex: 1, backgroundColor: '#181818'}}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: 'rgba(255,255,255,0.1)',
          marginBottom: 8,
        }}>
        <IconButton icon="movie-outline" iconColor="#E50914" size={26} style={{margin: 0, marginRight: 8}} />
        <Text style={{fontSize: 20, fontWeight: '900', color: '#E50914', letterSpacing: 1}}>TEFRIJA</Text>
      </View>
      <DrawerItemList {...props} />
    </DrawerContentScrollView>
  );
};

const Main = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const { isTabletLandscape } = useResponsive();

  return (
    <SafeAreaProvider>
      <Drawer.Navigator
        drawerContent={props => <CustomDrawerContent {...props} />}
        screenOptions={({ navigation }) => ({
          headerShown: false,
          drawerType: isTabletLandscape ? 'permanent' : 'front',
          drawerStyle: {
            width: 220,
            backgroundColor: '#181818',
            borderRightWidth: isTabletLandscape ? 1 : 0,
            borderRightColor: 'rgba(255,255,255,0.08)',
          },
          drawerActiveTintColor: '#E50914',
          drawerInactiveTintColor: '#aaaaaa',
          drawerActiveBackgroundColor: 'rgba(229, 9, 20, 0.15)',
          drawerItemStyle: {
            borderRadius: 8,
            marginHorizontal: 8,
            marginVertical: 2,
          },
          headerLeft: isTabletLandscape
            ? () => null
            : () => (
                <IconButton
                  icon="menu"
                  iconColor="#ffffff"
                  size={20}
                  onPress={() => navigation.openDrawer()}
                />
              ),
        })}>
        <Drawer.Screen
          name="Home"
          options={{
            headerShown: false,
            title: 'Tefrija',
            drawerLabel: 'Home',
            drawerIcon: ({color}) => (
              <IconButton
                icon="home"
                iconColor={color}
                size={20}
                style={{ padding: 0, margin: 0 }}
              />
            ),
          }}
          component={InitialHome}
        />
        <Drawer.Screen
          name="Search"
          options={{
            title: 'Search',
            headerShown: false,
            drawerLabel: 'Search',
            drawerIcon: ({color}) => (
              <IconButton
                icon="magnify"
                iconColor={color}
                size={20}
                style={{ padding: 0, margin: 0 }}
              />
            ),
          }}
          component={SearchStack}
        />
        <Drawer.Screen
          name="Downloads"
          options={{
            title: 'Downloads',
            drawerLabel: 'Downloads',
            drawerIcon: ({color}) => (
              <IconButton
                icon="download"
                iconColor={color}
                size={20}
                style={{ padding: 0, margin: 0 }}
              />
            ),
          }}
          component={DownloadsScreen}
        />
        <Drawer.Screen
          name="Updates"
          options={{
            title: 'Updates',
            drawerLabel: 'Version',
            drawerIcon: ({color}) => (
              <IconButton
                icon="update"
                iconColor={color}
                size={18}
                style={{ padding: 0, margin: 0 }}
              />
            ),
          }}
          component={UpdatesScreen}
        />

        <Drawer.Screen
          name="AboutScreen"
          component={AboutScreen}
          options={{
            title: 'About',
            drawerLabel: 'About',
            drawerIcon: ({color}) => (
              <IconButton
                icon="information"
                iconColor={color}
                size={18}
                style={{ padding: 0, margin: 0 }}
              />
            ),
          }}
        />
      </Drawer.Navigator>
    </SafeAreaProvider>
  );
};

// create root stack modal that will be used to show the video player

const RootStack = createNativeStackNavigator();

const App = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  React.useEffect(() => {
    ensureStreamServer().catch(e => {
      console.log('stream server failed to start', e);
    });
  }, []);

  return (
    <NavigationContainer theme={theme}>
      <RootStack.Navigator
        mode="card"
        headerMode="none"
        screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Main" component={Main} />
        <RootStack.Screen name="VideoPlayer" component={VideoPlayer} />
      </RootStack.Navigator>
      <WebFetchHost />
      <DownloadHost />
    </NavigationContainer>
  );
};

export default App;
