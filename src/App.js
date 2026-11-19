import * as React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {IconButton, Text} from 'react-native-paper';
import {DefaultTheme, DarkTheme, useNavigation} from '@react-navigation/native';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import {useColorScheme, View, StyleSheet, LogBox} from 'react-native';

LogBox.ignoreLogs(['Iconv-lite warning', 'Render Error: Should have a queue']);

import {MainScreen} from './screens/MainScreen';
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
import {WebFetchHost} from './stream/webFetch';
import {DownloadHost} from './stream/DownloadHost';
import {ensureStreamServer} from './stream/server';
import useResponsive from './utils/useResponsive';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const InitialHome = () => {
  SystemNavigationBar.navigationShow();

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
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

const CustomDrawerContent = props => {
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{paddingTop: 8}}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: 'rgba(150,150,150,0.3)',
          marginBottom: 8,
        }}>
        <IconButton icon="movie-outline" size={24} style={{margin: 0, marginRight: 6}} />
        <Text style={{fontSize: 20, fontWeight: 'bold'}}>Tefrija</Text>
      </View>
      <DrawerItemList {...props} />
    </DrawerContentScrollView>
  );
};

const Main = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const {isTabletLandscape} = useResponsive();

  return (
    <SafeAreaProvider>
      <Drawer.Navigator
        drawerContent={props => <CustomDrawerContent {...props} />}
        screenOptions={({navigation}) => ({
          drawerType: isTabletLandscape ? 'permanent' : 'front',
          drawerStyle: {
            width: 220,
          },
          headerLeft: isTabletLandscape
            ? () => null
            : () => (
                <IconButton
                  icon="menu"
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
            drawerLabel: 'Popular',
            drawerIcon: () => (
              <IconButton
                icon="home"
                size={20}
                style={{padding: 0, margin: 0}}
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
            drawerIcon: () => (
              <IconButton
                icon="magnify"
                size={20}
                style={{padding: 0, margin: 0}}
              />
            ),
          }}
          component={SearchScreen}
        />
        <Drawer.Screen
          name="Downloads"
          options={{
            title: 'Downloads',
            drawerLabel: 'Downloads',
            drawerIcon: () => (
              <IconButton
                icon="download"
                size={20}
                style={{padding: 0, margin: 0}}
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
            drawerIcon: () => (
              <IconButton
                icon="update"
                size={15}
                style={{padding: 0, margin: 0}}
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
            drawerIcon: () => (
              <IconButton
                icon="information"
                size={15}
                style={{padding: 0, margin: 0}}
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
        screenOptions={{headerShown: false}}>
        <RootStack.Screen name="Main" component={Main} />
        <RootStack.Screen name="VideoPlayer" component={VideoPlayer} />
      </RootStack.Navigator>
      <WebFetchHost />
      <DownloadHost />
    </NavigationContainer>
  );
};

export default App;
