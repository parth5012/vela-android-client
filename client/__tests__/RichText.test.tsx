import React from 'react';
import renderer, { act } from 'react-test-renderer';

// Mock WebView
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    WebView: (props: any) => React.createElement(View, props),
  };
});

// Mock Markdown
jest.mock('react-native-markdown-display', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => React.createElement(Text, null, props.children),
  };
});

import RichText from '../components/chat/RichText';

describe('RichText component', () => {
  it('renders markdown and latex segments correctly', () => {
    let component: any;
    act(() => {
      component = renderer.create(
        <RichText content="Hello $x^2$ world $$\n\\int y dy\n$$" />
      );
    });
    
    const tree = component.toJSON();
    expect(tree).not.toBeNull();
  });
});
