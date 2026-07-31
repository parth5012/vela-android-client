// OAuth callback URL parsing for the Google Workspace card.
//
// The backend (`Vela/agent/main.py` → `/oauth/callback`) redirects back to
// `vela-client://oauth/callback` after the browser-based OAuth flow with:
//   success: ?status=success
//   failure: ?status=error&message=<urlencoded>
//
// The `message` param is produced by Python's `urlencode`, which encodes
// spaces as `+`, so it must be decoded as `+` → space before
// `decodeURIComponent`.

export type OAuthCallbackStatus = 'success' | 'error' | null;

export interface OAuthCallbackResult {
  status: OAuthCallbackStatus;
  message?: string;
}

/**
 * Decode a url-encoded `message` param: `+` → space, then percent-decode.
 * Falls back to the `+`→space-only form if percent-decoding fails on
 * malformed input.
 */
export function decodeOAuthMessage(value: string): string {
  const plusDecoded = value.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(plusDecoded);
  } catch {
    return plusDecoded;
  }
}

/**
 * Parse the OAuth callback URL's query params.
 *
 * Returns `{ status: null }` for absent URLs, URLs without a query string,
 * or any status value other than `success`/`error` — callers treat that as
 * an unknown verdict (no popup; fall back to the token-status poll).
 */
export function parseOAuthCallbackUrl(url?: string | null): OAuthCallbackResult {
  if (!url) return { status: null };

  // Split on the query string rather than constructing a URL object so the
  // helper works for the `vela-client://` custom scheme on every runtime.
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) return { status: null };
  const query = url.slice(queryIndex + 1);

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(query);
  } catch {
    return { status: null };
  }

  const status = params.get('status');
  if (status !== 'success' && status !== 'error') {
    return { status: null };
  }

  const result: OAuthCallbackResult = { status };
  const message = params.get('message');
  if (message != null && message !== '') {
    result.message = decodeOAuthMessage(message);
  }
  return result;
}
