import * as React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {IconButton, Text} from 'react-native-paper';
import {DefaultTheme, DarkTheme, useNavigation} from '@react-navigation/native';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import {useColorScheme} from 'react-native';

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

const Main = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <SafeAreaProvider>
      <Drawer.Navigator
        screenOptions={({navigation}) => ({
          drawerStyle: {
            width: 200,
          },

          headerLeft: () => (
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
            title: 'Tefrija',
            drawerLabel: 'Popular',
            drawerIcon: () => (
              <IconButton
                icon="home"
                size={20}
                style={{padding: 0, margin: 0}}
              />
            ),
            headerTitleStyle: {
              width: 500,
            },

            headerRight: () => {
              const navigation = useNavigation();
              return (
                <IconButton
                  icon="magnify"
                  size={20}
                  onPress={() => {
                    navigation.navigate('Search');
                  }}
                />
              );
            },
          }}
          component={InitialHome}
        />
        <Drawer.Screen
          name="Search"
          options={{
            title: 'Search',
            drawerLabel: 'Search',
            drawerIcon: () => (
              <IconButton
                icon="magnify"
                size={20}
                style={{padding: 0, margin: 0}}
              />
            ),
            headerTitleStyle: {
              width: 500,
            },

            headerRight: () => {
              const navigation = useNavigation();
              return (
                <IconButton
                  icon="magnify"
                  size={20}
                  onPress={() => {
                    navigation.navigate('Search');
                  }}
                />
              );
            },
          }}
          component={SearchScreen}
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

  return (
    <NavigationContainer theme={theme}>
      <RootStack.Navigator
        mode="card"
        headerMode="none"
        screenOptions={{headerShown: false}}>
        <RootStack.Screen name="Main" component={Main} />
        <RootStack.Screen name="VideoPlayer" component={VideoPlayer} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default App;
