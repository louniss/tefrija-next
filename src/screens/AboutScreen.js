import React from 'react';
import {ScrollView, View} from 'react-native';
import {Card, Divider, Subheading, Caption} from 'react-native-paper';
import useResponsive from '../utils/useResponsive';

const AboutScreen = () => {
  const {isTablet} = useResponsive();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{width: '100%', maxWidth: isTablet ? 680 : undefined, alignSelf: 'center'}}>
        <Card style={styles.card}>
          <Card.Content>
            <Subheading>About the Developer</Subheading>
            <Divider style={styles.divider} />
            <Caption>Developer: Lounis</Caption>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Subheading>Software Version</Subheading>
            <Divider style={styles.divider} />
            <Caption>Version: 0.1.9</Caption>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = {
  container: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 8,
  },
};

export default AboutScreen;
