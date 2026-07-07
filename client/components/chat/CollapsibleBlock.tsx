import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleBlockProps {
  type: 'thought' | 'tool_call';
  name?: string;
  input?: string;
  isClosed: boolean;
  themeColors: any;
  themeSizes: any;
  accentHex: string;
  children: React.ReactNode;
}

export default function CollapsibleBlock({
  type,
  name,
  input,
  isClosed,
  themeColors,
  themeSizes,
  accentHex,
  children
}: CollapsibleBlockProps) {
  // If streaming (unclosed), default to expanded. Once closed, collapse it.
  const [collapsed, setCollapsed] = useState(isClosed);

  useEffect(() => {
    // If it transitions from streaming to closed, collapse it automatically
    if (isClosed) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
  }, [isClosed]);

  const toggleCollapse = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed(!collapsed);
  };

  const isThought = type === 'thought';
  const icon = isThought ? '🧠' : '⚙️';
  const title = isThought 
    ? 'Thought Process' 
    : `Executed: ${name || 'Tool'}`;

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: isThought ? 'rgba(255, 255, 255, 0.03)' : themeColors.card, 
        borderColor: isThought ? themeColors.border : accentHex + '33',
        borderStyle: 'solid',
      }
    ]}>
      {/* Header Pressable */}
      <Pressable 
        style={styles.header} 
        onPress={toggleCollapse}
      >
        <View style={styles.headerTextContainer}>
          <Text style={[styles.icon, { fontSize: themeSizes.text }]}>{icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[
              styles.title, 
              { color: themeColors.text, fontSize: themeSizes.text - 1 }
            ]}>
              {title}
            </Text>
            {input ? (
              <Text 
                numberOfLines={1} 
                style={[styles.inputLabel, { color: themeColors.textDark, fontSize: themeSizes.sub }]}
              >
                Args: {input}
              </Text>
            ) : null}
          </View>
        </View>
        <Text style={[styles.arrow, { color: themeColors.textDark, fontSize: themeSizes.text }]}>
          {collapsed ? '▼' : '▲'}
        </Text>
      </Pressable>

      {/* Collapsible Content */}
      {!collapsed && (
        <View style={[
          styles.content, 
          { 
            borderTopColor: themeColors.border,
            backgroundColor: isThought ? 'transparent' : 'rgba(0, 0, 0, 0.15)'
          }
        ]}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 6,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  icon: {
    marginRight: 2,
  },
  title: {
    fontWeight: '600',
  },
  inputLabel: {
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  arrow: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  content: {
    borderTopWidth: 1,
    padding: 12,
  },
});


