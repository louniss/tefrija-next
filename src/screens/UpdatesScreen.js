import React, {useState} from 'react';
import {View, Linking} from 'react-native';
import {
  Button,
  Card,
  Subheading,
  Caption,
  ActivityIndicator,
  Paragraph,
} from 'react-native-paper';

const CURRENT_VERSION = '0.1.9';

const UpdatesScreen = () => {
  const [loading, setLoading] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateUrl, setUpdateUrl] = useState('');
  const [versionDescription, setVersionDescription] = useState('');

  const checkForUpdates = async () => {
    setLoading(true);
    const updateUrl = 'https://white-tooth-c8bc.abcwork.workers.dev/';

    const response = await fetch(updateUrl, {cache: 'no-store'});
    if (response.ok) {
      const data = await response.json();
      if (data.version !== CURRENT_VERSION) {
        setUpdateAvailable(true);
        setUpdateUrl(data.url);
        setVersionDescription(data.description);
      }
    }

    setLoading(false);
  };

  const openUpdateUrl = () => {
    if (updateUrl) {
      Linking.openURL(updateUrl);
    }
  };

  return (
    <View style={styles.container}>
      <Card>
        <Card.Content>
          <Subheading>Check for Updates</Subheading>
          <Caption>Press the button below to check for updates.</Caption>
        </Card.Content>
        <Card.Actions>
          <Button
            mode="contained"
            onPress={checkForUpdates}
            disabled={loading}
            loading={loading}>
            Check for Updates
          </Button>
        </Card.Actions>
      </Card>

      {updateAvailable && (
        <Card style={styles.updateCard}>
          <Card.Content>
            <Subheading>Update Available</Subheading>
            <Caption>
              An update is available. Click the button below to update.
            </Caption>
            <Paragraph style={{padding: 5}}>{versionDescription}</Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button mode="contained" onPress={openUpdateUrl}>
              Update Now
            </Button>
          </Card.Actions>
        </Card>
      )}

      {loading && <ActivityIndicator style={styles.loading} size="large" />}
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    padding: 16,
  },
  updateCard: {
    marginTop: 16,
  },
  loading: {
    marginTop: 16,
  },
};

export default UpdatesScreen;
