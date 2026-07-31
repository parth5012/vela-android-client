import { parseOAuthCallbackUrl, decodeOAuthMessage } from '../utils/oauthCallback';

describe('oauthCallback utils', () => {
  describe('parseOAuthCallbackUrl', () => {
    it('should parse a success callback', () => {
      expect(
        parseOAuthCallbackUrl('vela-client://oauth/callback?status=success')
      ).toEqual({ status: 'success' });
    });

    it('should parse an error callback with a message', () => {
      expect(
        parseOAuthCallbackUrl('vela-client://oauth/callback?status=error&message=Token+exchange+failed')
      ).toEqual({ status: 'error', message: 'Token exchange failed' });
    });

    it('should decode + as a space in the message param', () => {
      expect(
        parseOAuthCallbackUrl('vela-client://oauth/callback?status=error&message=Server+not+configured')
      ).toEqual({ status: 'error', message: 'Server not configured' });
    });

    it('should decode percent-encoded messages', () => {
      expect(
        parseOAuthCallbackUrl('vela-client://oauth/callback?status=error&message=Token%20exchange%20failed')
      ).toEqual({ status: 'error', message: 'Token exchange failed' });
    });

    it('should return null status for absent url', () => {
      expect(parseOAuthCallbackUrl(undefined)).toEqual({ status: null });
      expect(parseOAuthCallbackUrl(null)).toEqual({ status: null });
      expect(parseOAuthCallbackUrl('')).toEqual({ status: null });
    });

    it('should return null status when there is no query string', () => {
      expect(parseOAuthCallbackUrl('vela-client://oauth/callback')).toEqual({ status: null });
    });

    it('should return null status for unknown status values', () => {
      expect(parseOAuthCallbackUrl('vela-client://oauth/callback?status=pending')).toEqual({ status: null });
    });

    it('should omit message when absent on a success callback', () => {
      expect(
        parseOAuthCallbackUrl('vela-client://oauth/callback?status=success&foo=bar')
      ).toEqual({ status: 'success' });
    });

    it('should return null status on malformed url', () => {
      expect(parseOAuthCallbackUrl('not a url')).toEqual({ status: null });
    });
  });

  describe('decodeOAuthMessage', () => {
    it('should convert + to spaces', () => {
      expect(decodeOAuthMessage('Server+not+configured')).toBe('Server not configured');
    });

    it('should percent-decode', () => {
      expect(decodeOAuthMessage('Token%20exchange%20failed')).toBe('Token exchange failed');
    });

    it('should handle malformed percent-encoding gracefully', () => {
      expect(decodeOAuthMessage('100%')).toBe('100%');
      expect(decodeOAuthMessage('a+b%zz')).toBe('a b%zz');
    });
  });
});
