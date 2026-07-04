import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { parseContent } from '../../utils/latexExtractor';
import LatexRenderer from './LatexRenderer';

interface RichTextProps {
  content: string;
}

export default function RichText({ content }: RichTextProps) {
  const segments = parseContent(content);

  return (
    <View style={styles.container}>
      {segments.map((segment, index) => {
        if (segment.type === 'markdown') {
          return (
            <Markdown key={index} style={markdownStyles}>
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

const markdownStyles = {
  body: {
    color: '#e4e4e7', // zinc-200
    fontSize: 15,
    lineHeight: 22,
  },
  link: {
    color: '#818cf8', // indigo-400
    textDecorationLine: 'underline' as const,
  },
  code_inline: {
    backgroundColor: '#27272a', // zinc-800
    color: '#f4f4f5', // zinc-100
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    paddingHorizontal: 4,
    borderRadius: 4,
    fontSize: 14,
  },
  code_block: {
    backgroundColor: '#18181b', // zinc-900
    borderColor: '#27272a', // zinc-800
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    color: '#f4f4f5',
  },
  fence: {
    backgroundColor: '#18181b', // zinc-900
    borderColor: '#27272a', // zinc-800
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    color: '#f4f4f5',
  },
  blockquote: {
    backgroundColor: '#18181b', // zinc-900
    borderColor: '#818cf8', // indigo-400
    borderLeftWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: 8,
    borderRadius: 4,
    color: '#a1a1aa',
  },
  heading1: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold' as const,
    marginTop: 14,
    marginBottom: 8,
  },
  heading3: {
    color: '#ffffff',
    fontSize: 16,
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
    color: '#e4e4e7',
    marginVertical: 2,
  },
  strong: {
    fontWeight: 'bold' as const,
    color: '#ffffff',
  },
  em: {
    fontStyle: 'italic' as const,
  },
};
