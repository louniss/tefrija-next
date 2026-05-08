import React, {Component} from 'react';

import {SafeAreaView} from 'react-native-safe-area-context';
import MapView from '../Components/MapView';

export default class MapScreen extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  async init() {}

  async componentDidMount() {
    await this.init();
  }

  render() {
    const {navigation} = this.props;

    return (
      <SafeAreaView>
        <MapView />
      </SafeAreaView>
    );
  }
}
