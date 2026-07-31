# Context — Vela Client

Single context for the Vela Android AI assistant app (Expo SDK 57).

## Glossary

- **OAuth callback** — the deep link `vela-client://oauth/callback` that the Vela backend redirects to after Google OAuth completes or fails. Carries the verdict as a query param.
- **Callback verdict** — the `status` query param on the OAuth callback: `success` or `error`. An `error` verdict also carries a human-readable `message` param.
- **In-session callback** — a callback caught by `expo-web-browser` while the `openAuthSessionAsync` promise is alive; surfaces as `result.url`.
- **Cold-start callback** — a callback delivered by the OS to a freshly launched app instance (`Linking.getInitialURL`), with no live browser session. Currently out of scope for the OAuth popup effort.
- **Vela backend** — the sibling repo `D:\work\projects\Vela`; owns the Google OAuth flow and the `/oauth/token/status` sync endpoint.
