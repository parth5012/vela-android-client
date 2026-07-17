import React from 'react';
import renderer, { act } from 'react-test-renderer';
import MermaidRenderer from '../components/chat/MermaidRenderer';
import RichText from '../components/chat/RichText';

// Mock WebView
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    WebView: (props: any) => React.createElement(View, { ...props, testID: 'webview-mock' }),
  };
});

// Mock Clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

// Mock Markdown inside the test so we can inspect and simulate code block behavior
jest.mock('react-native-markdown-display', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => {
      const content = props.children || '';
      const rules = props.rules || {};
      
      // Simulate rendering standard Markdown or calling custom rules
      if (typeof content === 'string') {
        if (content.includes('```mermaid')) {
          const node = {
            key: 'simulated-mermaid',
            content: 'graph TD\nA-->B',
            info: 'mermaid',
          };
          if (rules.fence) {
            return rules.fence(node);
          }
        } else if (content.includes('```typescript')) {
          const node = {
            key: 'simulated-typescript',
            content: 'const x = 1;',
            info: 'typescript',
          };
          if (rules.fence) {
            return rules.fence(node);
          }
        }
      }
      return React.createElement(View, null);
    },
  };
});

describe('MermaidRenderer component', () => {
  it('renders the diagram tab by default', () => {
    let component: any;
    act(() => {
      component = renderer.create(
        <MermaidRenderer graph="graph TD\nA-->B" />
      );
    });
    
    // By default, it renders the WebView for the diagram
    const webview = component.root.findByProps({ testID: 'webview-mock' });
    expect(webview).toBeTruthy();
  });

  it('switches to the source tab when clicked, showing the raw code', () => {
    let component: any;
    act(() => {
      component = renderer.create(
        <MermaidRenderer graph="graph TD\nA-->B" />
      );
    });

    // Find the text element containing "Source"
    const sourceTextNode = component.root.find((node: any) => {
      if (node.type === 'Text') {
        const children = node.props.children;
        const textStr = Array.isArray(children) ? children.join('') : String(children || '');
        return textStr.includes('Source');
      }
      return false;
    });

    expect(sourceTextNode).toBeTruthy();

    // Climb up to find the Pressable/clickable container
    let sourceTab = sourceTextNode;
    while (sourceTab && (!sourceTab.props || typeof sourceTab.props.onPress !== 'function')) {
      sourceTab = sourceTab.parent;
    }

    expect(sourceTab).toBeTruthy();

    act(() => {
      sourceTab.props.onPress();
    });

    // In source view, it should show the raw graph text
    const textNode = component.root.find((node: any) => {
      if (node.type === 'Text') {
        const children = node.props.children;
        const textStr = Array.isArray(children) ? children.join('') : String(children || '');
        return textStr.includes('graph TD');
      }
      return false;
    });
    expect(textNode).toBeTruthy();
  });
});

describe('RichText integration with MermaidRenderer', () => {
  it('renders MermaidRenderer for mermaid fenced blocks', () => {
    let component: any;
    act(() => {
      component = renderer.create(
        <RichText content="```mermaid\ngraph TD\nA-->B\n```" />
      );
    });

    // It should have resolved to rendering a MermaidRenderer, which contains the WebView mock
    const webview = component.root.findByProps({ testID: 'webview-mock' });
    expect(webview).toBeTruthy();
  });

  it('renders standard code blocks for non-mermaid languages', () => {
    let component: any;
    act(() => {
      component = renderer.create(
        <RichText content="```typescript\nconst x = 1;\n```" />
      );
    });

    // For typescript, it should render the standard code block (contains the text code)
    const textNode = component.root.find((node: any) => {
      if (node.type === 'Text') {
        const children = node.props.children;
        const textStr = Array.isArray(children) ? children.join('') : String(children || '');
        return textStr.includes('const x = 1');
      }
      return false;
    });
    expect(textNode).toBeTruthy();
    
    // And should not contain WebView mock
    expect(() => component.root.findByProps({ testID: 'webview-mock' })).toThrow();
  });
});
