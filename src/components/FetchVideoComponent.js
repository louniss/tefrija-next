import * as React from 'react';
import WebView from 'react-native-webview';

import {useRef, useState} from 'react';

import {View} from 'react-native';

export const FetchVideoComponent = ({
  id,
  type,
  season,
  episode,
  onDone,
  onError,
}) => {
  const webview = useRef(null);

  const [doneIframe, setDoneIframe] = useState(false);
  const [doneM3u8, setDoneM3u8] = useState(false);
  const [iframeUrls, setIframeUrls] = useState([]);

  let src;

  if (type === 'movie') {
    src = `https://vsembed.su/embed/movie/${id}`;
  } else {
    src = `https://vsembed.su/embed/tv/${id}/${season}/${episode}`;
  }

  const [url, setUrl] = useState(src);

  const injectScript = `
  // intercept xhr requests and search for .m3u8
  var open = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.removeEventListener = function() {};
  window.XMLHttpRequest.prototype.open = function(method, url) {
    if (url.includes('master.m3u8')) {
      window.ReactNativeWebView.postMessage(JSON.stringify({url: url, type: 'master.m3u8'}));
    } 

    if (url.includes('list.m3u8')) {
      window.ReactNativeWebView.postMessage(JSON.stringify({url: url, type: 'list.m3u8'}));
    }

    open.apply(this, arguments);
  };

  // setInterval to check for iframe source and postMessage
  setInterval(() => {
    var iframe = document.querySelector('#player_iframe');
    if (iframe) {
      window.ReactNativeWebView.postMessage(JSON.stringify({url: iframe.src, type: 'iframe'}));
    }
  }, 500);

  // check for button with id btn-play and click it
  setInterval(() => {
    var btn = document.querySelector('#pl_but_background');
    if (btn) {
      btn.click();
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'other', url: 'clicked'}));
    }
  }, 500);
`;

  return (
    <View>
      <WebView
        ref={webview}
        style={{width: 1, height: 1, position: 'absolute'}}
        originWhitelist={['*']}
        allowsLinkPreview={true}
        source={{
          uri: url,
          headers: {
            origin: 'https://cloudnestra.com',
            referer: 'https://cloudnestra.com/',
          },
        }}
        injectedJavaScriptBeforeContentLoaded={injectScript}
        injectedJavaScript={injectScript}
        onMessage={async event => {
          const data = JSON.parse(event.nativeEvent.data);
          const {url, type} = data;

          switch (type) {
            case 'master.m3u8':
            case 'list.m3u8':
              console.log('master.m3u8', url);
              const response = await fetch(url, {
                method: 'GET',
              });
              if (response.status === 200) {
                setUrl('');
                onDone(url);
              } else {
                console.log('error', response.status);
                onDone(url);
              }
              break;

            /*case 'list.m3u8':
            console.log('list.m3u8', url);
            setUrl('');
            onDone(url);
            break;*/

            case 'iframe':
              if (iframeUrls.includes(url)) {
                return;
              }

              setIframeUrls([...iframeUrls, url]);
              if (!doneIframe) {
                if (url) {
                  setUrl(url);
                }
                //setDoneIframe(true);
                console.log('iframe', url);
              }
              break;

            case 'other':
              console.log('other', url);
              break;
          }
        }}
      />
    </View>
  );
};
