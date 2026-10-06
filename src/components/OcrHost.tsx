import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { engineHost } from '../services/ocrEngine';
import { ocrEngineHtml } from '../services/ocrEngineHtml';

/** Invisible page that reads the text on receipt photos. Mount it once, near the top of the app. */
export function OcrHost() {
  const ref = useRef<WebView>(null);
  const [key, setKey] = useState(0);
  useEffect(() => {
    engineHost.attach(
      (id, base64) => ref.current?.injectJavaScript(`window.__scan(${id}, ${JSON.stringify(base64)}); true;`),
      () => setKey(k => k + 1),
    );
    return () => engineHost.detach();
  }, []);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, bottom: 0, width: 2, height: 2, opacity: 0.02 }} accessible={false} importantForAccessibility="no-hide-descendants">
      <WebView
        key={key} ref={ref} originWhitelist={['*']} source={{ html: ocrEngineHtml, baseUrl: 'https://maplestub.local/' }}
        javaScriptEnabled onMessage={e => engineHost.message(e.nativeEvent.data)} cacheEnabled
        onError={() => engineHost.message(JSON.stringify({ type: 'loadError' }))}
        onHttpError={() => engineHost.message(JSON.stringify({ type: 'loadError' }))}
        // iOS can stop the page to free memory (the camera is open at the same time). Start it again.
        onContentProcessDidTerminate={() => engineHost.message(JSON.stringify({ type: 'crashed' }))}
        onRenderProcessGone={() => engineHost.message(JSON.stringify({ type: 'crashed' }))}
      />
    </View>
  );
}
