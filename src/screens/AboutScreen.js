import React from 'react';
import {ScrollView} from 'react-native';
import {Card, Divider, Subheading, Caption} from 'react-native-paper';

const AboutScreen = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
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
          <Caption>Version: 0.1.6</Caption>
        </Card.Content>
      </Card>
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
