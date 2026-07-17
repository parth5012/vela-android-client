import React, { useState } from 'react';
import { View, StyleSheet, Platform, Text, Pressable, ScrollView, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import { THEME_COLORS, FONT_SIZES, ACCENT_COLORS } from '../../utils/theme';

interface MermaidRendererProps {
  graph: string;
  theme?: 'deep' | 'slate' | 'cyberpunk' | 'nordic' | 'dracula' | 'oled';
  fontSize?: 'small' | 'medium' | 'large';
  accentColor?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'violet' | 'pink' | 'orange' | 'blue';
}

export default function MermaidRenderer({
  graph,
  theme = 'deep',
  fontSize = 'medium',
  accentColor = 'indigo',
}: MermaidRendererProps) {
  const [activeTab, setActiveTab] = useState<'diagram' | 'source'>('diagram');
  const [height, setHeight] = useState(180);
  const [hasError, setHasError] = useState(false);

  const colors = THEME_COLORS[theme] || THEME_COLORS.deep;
  const sizes = FONT_SIZES[fontSize] || FONT_SIZES.medium;
  const accentHex = ACCENT_COLORS[accentColor] || ACCENT_COLORS.indigo;

  // Fallback for Web targets where WebView is unavailable
  if (Platform.OS === 'web') {
    return renderSourceView();
  }

  function renderSourceView() {
    return (
      <View style={[styles.codeBlockWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>
          <Text style={[styles.codeText, { color: colors.text, fontSize: sizes.text - 1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
            {graph.replace(/\n$/, '')}
          </Text>
        </ScrollView>
      </View>
    );
  }

  const isDark = theme !== 'slate'; // Slate is the only light-like theme
  const mermaidTheme = isDark ? 'dark' : 'default';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script src="https://cdn.jsdelivr.net/npm/mermaid@10.2.4/dist/mermaid.min.js"></script>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: transparent;
          color: ${colors.text};
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        #diagram {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 12px;
          min-height: 50px;
        }
        /* Style adjustments for dark theme SVGs */
        svg {
          max-width: 100% !important;
          height: auto !important;
        }
        .error-msg {
          color: #ef4444;
          font-size: 13px;
          font-family: monospace;
          padding: 8px;
          border: 1px solid rgba(239, 68, 68, 0.2);
          background: rgba(239, 68, 68, 0.05);
          border-radius: 6px;
        }
      </style>
    </head>
    <body>
      <div id="diagram">Rendering...</div>
      <script>
        document.addEventListener("DOMContentLoaded", function() {
          const container = document.getElementById('diagram');
          try {
            mermaid.initialize({
              startOnLoad: false,
              theme: '${mermaidTheme}',
              securityLevel: 'loose',
              logLevel: 4,
            });

            const uniqueId = 'mermaid-svg-' + Date.now();
            const rawGraph = ${JSON.stringify(graph)};

            mermaid.render(uniqueId, rawGraph).then(({ svg }) => {
              container.innerHTML = svg;
              sendHeight();
              // Polling for sizing layout updates
              setTimeout(sendHeight, 100);
              setTimeout(sendHeight, 300);
              setTimeout(sendHeight, 600);
            }).catch((err) => {
              showError(err.message || err);
            });
          } catch (err) {
            showError(err.message || err);
          }

          function showError(msg) {
            container.innerHTML = '<div class="error-msg">Mermaid Compile Error: ' + msg + '</div>';
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ error: true }));
            }
            sendHeight();
          }

          function sendHeight() {
            const height = document.documentElement.scrollHeight || document.body.scrollHeight;
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ height: height }));
            }
          }
        });
      </script>
    </body>
    </html>
  `;

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(graph);
    Alert.alert('Copied', 'Mermaid code copied to clipboard.');
  };

  return (
    <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.card }]}>
      {/* Tab Headers */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tabButton, activeTab === 'diagram' && { borderBottomColor: accentHex }]}
            onPress={() => setActiveTab('diagram')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'diagram' ? colors.text : colors.textDark, fontSize: sizes.sub, fontWeight: activeTab === 'diagram' ? 'bold' : 'normal' }]}>
              📊 Diagram
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === 'source' && { borderBottomColor: accentHex }]}
            onPress={() => setActiveTab('source')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'source' ? colors.text : colors.textDark, fontSize: sizes.sub, fontWeight: activeTab === 'source' ? 'bold' : 'normal' }]}>
              📝 Source
            </Text>
          </Pressable>
        </View>

        {activeTab === 'source' && (
          <Pressable style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.7 }]} onPress={copyToClipboard}>
            <Text style={{ color: colors.textMuted, fontSize: sizes.sub - 1, fontWeight: 'bold' }}>Copy</Text>
          </Pressable>
        )}
      </View>

      {/* Render Active View */}
      {activeTab === 'diagram' ? (
        <View style={[styles.webviewContainer, { height: height }]}>
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
                  setHeight(Math.max(data.height, 80));
                }
                if (data.error) {
                  setHasError(true);
                }
              } catch (e) {
                // Ignore
              }
            }}
          />
        </View>
      ) : (
        renderSourceView()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    marginVertical: 8,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    height: 38,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 16,
    height: '100%',
  },
  tabButton: {
    justifyContent: 'center',
    height: '100%',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    paddingHorizontal: 4,
  },
  tabText: {
    textAlign: 'center',
  },
  copyBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  webviewContainer: {
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
  },
  webview: {
    backgroundColor: 'transparent',
  },
  codeBlockWrapper: {
    borderWidth: 0,
    padding: 12,
    alignSelf: 'stretch',
  },
  codeText: {
    lineHeight: 18,
  },
});
