import { create } from 'zustand';
import React from 'react';
import { useConfigStore } from './useConfigStore';

// --- Types ---

interface WebviewAction {
  conversation_id: string;
  action: string;
  target?: string;
  value?: string;
}

interface PendingApproval {
  action: WebviewAction;
  description: string;
}

interface BrowserState {
  currentUrl: string;
  isVisible: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  pageTitle: string;
  pendingApproval: PendingApproval | null;
  pendingAction: WebviewAction | null;
  lastExecutedId: string | null;
  aiStatus: string | null;

  // Actions
  navigate: (url: string) => void;
  setVisible: (visible: boolean) => void;
  setNavState: (canGoBack: boolean, canGoForward: boolean, url: string, title: string) => void;
  setLoading: (loading: boolean) => void;
  setLastExecutedId: (id: string | null) => void;
  setAiStatus: (status: string | null) => void;
  handleWebviewAction: (input: WebviewAction) => void;
  approveAction: () => void;
  denyAction: () => void;
  clearPendingAction: () => void;
}

// --- Pure helpers ---

const SENSITIVE_INPUT_TYPES = ['password', 'email', 'tel'];
const SENSITIVE_ACTIONS = ['submit_form'];

const isSensitive = (action: string, target?: string): boolean => {
  if (SENSITIVE_ACTIONS.includes(action)) return true;
  if (!target) return false;
  const lower = target.toLowerCase();
  return SENSITIVE_INPUT_TYPES.some((t) => lower.includes(`type="${t}"`)) ||
    lower.includes('submit');
};

const formatActionDescription = (input: WebviewAction): string => {
  switch (input.action) {
    case 'navigate':
      return `Navigate to ${input.value}`;
    case 'click':
      return `Click element: ${input.target}`;
    case 'fill':
      return `Fill "${input.target}" with value`;
    case 'extract_dom':
      return 'Extract page structure';
    case 'submit_form':
      return `Submit form: ${input.target || 'current'}`;
    default:
      return `${input.action}: ${input.target || input.value || ''}`;
  }
};

// --- WebView ref (shared mutable ref, not in store) ---

export const webViewRef: React.RefObject<any> = React.createRef();

// --- Script injection ---

const injectScript = (script: string): void => {
  webViewRef.current?.injectJavaScript(script);
};

const buildDomExtractionScript = (): string => `
  (function(){
    try {
      var elements = document.querySelectorAll('button, input, textarea, select, [role="button"], h1, h2, h3');
      var results = [];
      var counter = 0;
      elements.forEach(function(el) {
        var rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        var style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

        var refId = 'e' + counter++;
        el.setAttribute('data-vela-id', refId);

        var text = (el.innerText || el.placeholder || el.value || '').trim();
        if (text.length > 100) {
          text = text.substring(0, 100) + '...';
        }

        results.push({
          id: '@' + refId,
          tag: el.tagName.toLowerCase(),
          type: el.type || '',
          text: text,
          title: el.title || '',
          placeholder: el.placeholder || ''
        });
      });
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'dom_extracted', data: results}));
    } catch(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', data: e.message}));
    }
  })();
`;

const buildClickScript = (target: string): string => `
  (function(){
    try {
      var el;
      if ("${target}".startsWith("@e")) {
        var velaId = "${target}".substring(1);
        el = document.querySelector('[data-vela-id="' + velaId + '"]');
      } else {
        el = document.querySelector("${target}");
      }
      if (el) {
        el.click();
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'click_success', data: 'Successfully clicked element: "${target}"'}));
      } else {
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', data: 'Element not found: "${target}"'}));
      }
    } catch(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', data: e.message}));
    }
  })();
`;

const buildFillScript = (target: string, value: string): string => {
  const escaped = JSON.stringify(value);
  return `
    (function(){
      try {
        var el;
        if ("${target}".startsWith("@e")) {
          var velaId = "${target}".substring(1);
          el = document.querySelector('[data-vela-id="' + velaId + '"]');
        } else {
          el = document.querySelector("${target}");
        }
        if (el) {
          el.focus();
          el.value = ${escaped};
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'fill_success', data: 'Successfully filled element: "${target}"'}));
        } else {
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', data: 'Element not found: "${target}"'}));
        }
      } catch(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', data: e.message}));
      }
    })();
  `;
};

// --- Backend communication ---

const normalizeUrl = (rawUrl: string): string => {
  let formatted = (rawUrl || '').trim();
  if (!formatted) return '';
  if (!/^https?:\/\//i.test(formatted)) {
    formatted = 'https://' + formatted;
  }
  return formatted.replace(/\/+$/, '');
};

const sendResponse = async (conversationId: string, status: string, result: string): Promise<void> => {
  if (!conversationId) return;
  const { apiUrl, apiKey } = useConfigStore.getState();
  const formattedUrl = normalizeUrl(apiUrl);
  if (!formattedUrl || !apiKey) return;
  try {
      let response = await fetch(`${formattedUrl}/chat/webview/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          status,
          result,
        }),
      });

      if (response.status === 404 || response.status === 405) {
        response = await fetch(`${formattedUrl}/webview/response`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            status,
            result,
          }),
        });
      }

      if (!response.ok && response.status !== 404 && response.status !== 405) {
        console.warn('Webview response endpoint status:', response.status);
      }
  } catch (err) {
    console.warn('Network notice sending webview response to backend:', err);
  }
};

// --- Execute action (after approval or auto) ---

const executeAction = (input: WebviewAction): void => {
  const store = useBrowserStore.getState();

  if (input.action === 'navigate' && input.value) {
    store.setLoading(true);
    store.navigate(input.value);
    useBrowserStore.setState({
      pendingAction: { ...input },
      aiStatus: formatActionDescription(input),
    });
  } else {
    useBrowserStore.setState({
      pendingAction: { ...input },
      aiStatus: formatActionDescription(input),
    });
    setTimeout(() => {
      if (input.action === 'extract_dom') {
        injectScript(buildDomExtractionScript());
      } else if (input.action === 'click' && input.target) {
        injectScript(buildClickScript(input.target));
      } else if (input.action === 'fill' && input.target && input.value !== undefined) {
        injectScript(buildFillScript(input.target, input.value));
      }
    }, 300);
  }
};

// --- Store ---

export const useBrowserStore = create<BrowserState>()((set, get) => ({
  currentUrl: 'about:blank',
  isVisible: false,
  canGoBack: false,
  canGoForward: false,
  isLoading: false,
  pageTitle: '',
  pendingApproval: null,
  pendingAction: null,
  lastExecutedId: null,
  aiStatus: null,

  navigate: (url) => {
    let formatted = url.trim();
    if (!/^https?:\/\//i.test(formatted)) {
      formatted = 'https://' + formatted;
    }
    set({ currentUrl: formatted, isLoading: true });
  },

  setVisible: (visible) => set({ isVisible: visible }),

  setNavState: (canGoBack, canGoForward, url, title) =>
    set({ canGoBack, canGoForward, currentUrl: url, pageTitle: title }),

  setLoading: (loading) => set({ isLoading: loading }),

  setLastExecutedId: (id) => set({ lastExecutedId: id }),

  setAiStatus: (status) => set({ aiStatus: status }),

  handleWebviewAction: (input) => {
    set({ isVisible: true });

    if (isSensitive(input.action, input.target)) {
      set({
        pendingApproval: {
          action: input,
          description: formatActionDescription(input),
        },
      });
    } else {
      executeAction(input);
    }
  },

  approveAction: () => {
    const { pendingApproval } = get();
    if (!pendingApproval) return;
    set({ pendingApproval: null });
    executeAction(pendingApproval.action);
  },

  denyAction: () => {
    const { pendingApproval } = get();
    if (!pendingApproval) return;
    set({ pendingApproval: null, aiStatus: null });
    sendResponse(pendingApproval.action.conversation_id, 'denied_by_user', 'User denied the action');
  },

  clearPendingAction: () => set({ pendingAction: null, aiStatus: null }),
}));

// --- WebView event handlers (called from _layout.tsx) ---

export const handleWebViewLoadEnd = (): void => {
  const { pendingAction } = useBrowserStore.getState();
  useBrowserStore.setState({ isLoading: false });

  if (pendingAction?.action === 'navigate') {
    sendResponse(
      pendingAction.conversation_id,
      'success',
      `Successfully loaded URL: ${pendingAction.value}`
    );
    useBrowserStore.setState({ pendingAction: null, aiStatus: null });
  }
};

export const handleWebViewMessage = (event: any): void => {
  const { pendingAction } = useBrowserStore.getState();
  try {
    const response = JSON.parse(event.nativeEvent.data);
    if (!pendingAction) return;

    if (response.type === 'dom_extracted') {
      sendResponse(pendingAction.conversation_id, 'success', JSON.stringify(response.data));
      useBrowserStore.setState({ pendingAction: null, aiStatus: null });
    } else if (response.type === 'click_success' || response.type === 'fill_success') {
      sendResponse(pendingAction.conversation_id, 'success', response.data);
      useBrowserStore.setState({ pendingAction: null, aiStatus: null });
    } else if (response.type === 'error') {
      sendResponse(pendingAction.conversation_id, 'error', response.data);
      useBrowserStore.setState({ pendingAction: null, aiStatus: null });
    }
  } catch (e) {
    console.error('Failed to parse webview message:', e);
    if (pendingAction) {
      sendResponse(pendingAction.conversation_id, 'error', 'Invalid response from webview');
      useBrowserStore.setState({ pendingAction: null, aiStatus: null });
    }
  }
};
