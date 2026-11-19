/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('react-native-webview', () => 'WebView');
jest.mock('@react-native-community/slider', () => 'Slider');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
    setOptions: jest.fn(),
  }),
}));
jest.mock('../src/movieDb', () => ({
  moviedb: {
    movieInfo: jest.fn(() => Promise.resolve({})),
    tvInfo: jest.fn(() => Promise.resolve({})),
    episodeInfo: jest.fn(() => Promise.resolve({})),
    seasonInfo: jest.fn(() => Promise.resolve({episodes: []})),
  },
}));
jest.mock('../src/state/Main', () => () => ({}));
jest.mock('../src/SubtitleManager', () => class {});
jest.mock('../src/utils/useResponsive', () => () => ({isTablet: false}));
jest.mock('react-native-paper', () => {
  const mockReact = require('react');
  const {View, Text, TouchableOpacity} = require('react-native');
  const Container = ({children, ...props}) =>
    mockReact.createElement(View, props, children);
  return {
    IconButton: props => mockReact.createElement(TouchableOpacity, props),
    Text: ({children, ...props}) =>
      mockReact.createElement(Text, props, children),
    Portal: Container,
    Divider: Container,
    Icon: Container,
  };
});

import ExtraControls from '../src/screens/Player/ExtraControls';

const props = {
  isPlaying: true,
  setIsPlaying: jest.fn(),
  videoRef: {current: null},
  duration: 100,
  currentTime: 0,
  setCurrentTime: jest.fn(),
  liveCurrentTime: 10,
  subtitleText: '',
  subtitleIsVisible: true,
  id: 1,
  type: 'movie',
  setSubtitleIsVisible: jest.fn(),
  setSelectedLang: jest.fn(),
  setSubtitleDelay: jest.fn(),
  setSubtitleNumber: jest.fn(),
  setUri: jest.fn(),
  setResizeMode: jest.fn(),
  setVolume: jest.fn(),
  setPlaybackRate: jest.fn(),
};

const overlayOf = root =>
  root.findAll(
    node =>
      node.props.pointerEvents !== undefined &&
      Array.isArray(node.props.style) &&
      node.props.style[0]?.zIndex === undefined,
  )[0];

const tapLayerOf = root =>
  root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.props.style?.position === 'absolute',
  )[0];

const mount = async () => {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<ExtraControls {...props} />);
  });
  return renderer;
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ExtraControls visibility', () => {
  it('keeps a full-size tap target under the controls', async () => {
    const renderer = await mount();

    const [tapLayer] = renderer.toJSON().children;
    expect(tapLayer.props.style).toEqual(
      expect.objectContaining({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }),
    );
  });

  it('hides itself while playing and comes back on a tap', async () => {
    const renderer = await mount();
    const root = renderer.root;

    expect(overlayOf(root).props.pointerEvents).toBe('box-none');

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(4500);
    });
    expect(overlayOf(root).props.pointerEvents).toBe('none');

    await ReactTestRenderer.act(async () => {
      tapLayerOf(root).props.onPress({nativeEvent: {locationX: 100}});
      jest.advanceTimersByTime(400);
    });

    expect(overlayOf(root).props.pointerEvents).toBe('box-none');
  });
});
