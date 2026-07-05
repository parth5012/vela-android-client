import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { parseContent } from '../../utils/latexExtractor';
import LatexRenderer from './LatexRenderer';
import { THEME_COLORS, FONT_SIZES, ACCENT_COLORS } from '../../utils/theme';

interface RichTextProps {
  content: string;
  theme?: 'deep' | 'slate' | 'cyberpunk';
  fontSize?: 'small' | 'medium' | 'large';
  accentColor?: 'indigo' | 'emerald' | 'rose' | 'amber';
}

export default function RichText({
  content,
  theme = 'deep',
  fontSize = 'medium',
  accentColor = 'indigo',
}: RichTextProps) {
  const segments = parseContent(content);
  const colors = THEME_COLORS[theme] || THEME_COLORS.deep;
  const sizes = FONT_SIZES[fontSize] || FONT_SIZES.medium;
  const accentHex = ACCENT_COLORS[accentColor] || ACCENT_COLORS.indigo;

  const dynamicMarkdownStyles = {
    body: {
      color: colors.text,
      fontSize: sizes.text,
      lineHeight: sizes.text * 1.45,
    },
    link: {
      color: accentHex,
      textDecorationLine: 'underline' as const,
    },
    code_inline: {
      backgroundColor: colors.card,
      color: colors.text,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      paddingHorizontal: 4,
      borderRadius: 4,
      fontSize: sizes.text - 1,
    },
    code_block: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginVertical: 8,
      color: colors.text,
      fontSize: sizes.text - 1,
    },
    fence: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginVertical: 8,
      color: colors.text,
      fontSize: sizes.text - 1,
    },
    blockquote: {
      backgroundColor: colors.card,
      borderColor: accentHex,
      borderLeftWidth: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginVertical: 8,
      borderRadius: 4,
      color: colors.textMuted,
      fontSize: sizes.text,
    },
    heading1: {
      color: colors.text,
      fontSize: sizes.title + 2,
      fontWeight: 'bold' as const,
      marginTop: 16,
      marginBottom: 8,
    },
    heading2: {
      color: colors.text,
      fontSize: sizes.title,
      fontWeight: 'bold' as const,
      marginTop: 14,
      marginBottom: 8,
    },
    heading3: {
      color: colors.text,
      fontSize: sizes.title - 2,
      fontWeight: 'bold' as const,
      marginTop: 12,
      marginBottom: 6,
    },
    bullet_list: {
      marginVertical: 8,
    },
    ordered_list: {
      marginVertical: 8,
    },
    list_item: {
      color: colors.text,
      marginVertical: 2,
      fontSize: sizes.text,
    },
    strong: {
      fontWeight: 'bold' as const,
      color: colors.text,
    },
    em: {
      fontStyle: 'italic' as const,
    },
  };

  return (
    <View style={styles.container}>
      {segments.map((segment, index) => {
        if (segment.type === 'markdown') {
          return (
            <Markdown key={index} style={dynamicMarkdownStyles}>
              {segment.content}
            </Markdown>
          );
        } else if (segment.type === 'latex-inline') {
          return (
            <LatexRenderer
              key={index}
              formula={segment.content}
              displayMode={false}
            />
          );
        } else if (segment.type === 'latex-block') {
          return (
            <LatexRenderer
              key={index}
              formula={segment.content}
              displayMode={true}
            />
          );
        }
        return null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
});

