import React, { useState } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

interface LatexRendererProps {
  formula: string;
  displayMode?: boolean;
}

export default function LatexRenderer({ formula, displayMode = false }: LatexRendererProps) {
  const [height, setHeight] = useState(displayMode ? 60 : 30);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.fallbackContainer, displayMode && styles.blockPadding]}>
        <Text style={styles.fallbackText}>
          {displayMode ? `$$\n${formula}\n$$` : `$${formula}$`}
        </Text>
      </View>
    );
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: transparent;
          color: #e4e4e7;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        #math {
          display: ${displayMode ? 'block' : 'inline-block'};
          font-size: 16px;
          text-align: ${displayMode ? 'center' : 'left'};
        }
        .katex-display {
          margin: 0.5em 0 !important;
        }
      </style>
    </head>
    <body>
      <div id="math"></div>
      <script>
        document.addEventListener("DOMContentLoaded", function() {
          const container = document.getElementById('math');
          try {
            katex.render(${JSON.stringify(formula)}, container, {
              displayMode: ${displayMode},
              throwOnError: false
            });
          } catch (err) {
            container.innerText = ${JSON.stringify(formula)};
          }
          
          function sendHeight() {
            const height = document.documentElement.scrollHeight || document.body.scrollHeight;
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ height: height }));
            }
          }
          
          sendHeight();
          setTimeout(sendHeight, 100);
          setTimeout(sendHeight, 300);
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, { height: height }, displayMode && styles.blockPadding]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        scrollEnabled={false}
        overScrollMode="never"
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.height) {
              setHeight(data.height);
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    alignSelf: 'stretch',
  },
  webview: {
    backgroundColor: 'transparent',
  },
  blockPadding: {
    marginVertical: 8,
    alignItems: 'center',
  },
  fallbackContainer: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginVertical: 4,
  },
  fallbackText: {
    color: '#e4e4e7',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
  },
});
