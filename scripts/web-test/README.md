# Testing the app on web against the mock API

No production account needed. The website's built-in mock API (sign-in code `123456`)
runs as a small local server, and the app is exported for web pointing at it.

```bash
node scripts/web-test/build-mock-api.mjs ../study_web_app /tmp/kushi-mock/server.mjs
node /tmp/kushi-mock/server.mjs            # http://localhost:4100/graphql
CI=1 EXPO_PUBLIC_API_URL=http://localhost:4100/graphql npx expo export --platform web --clear --output-dir /tmp/kushi-web
node scripts/web-test/static.mjs /tmp/kushi-web 8097   # open http://localhost:8097
```

Native-only modules (Google sign-in, purchases, Apple sign-in, SQLite) are stubbed on web
(metro.config.js), so test those on a device.
