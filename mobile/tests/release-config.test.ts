const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

// Config runs in Node before Metro. Avoid Expo's Jest transform inlining public env values.
const configModule = { exports: {} as any };
runInNewContext(readFileSync(require('node:path').resolve('app.config.js'), 'utf8'), { module: configModule, require, process });
const configure = configModule.exports;

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; });

test('production rejects localhost and demo mode before bundling', () => {
  process.env.APP_ENV = 'production';
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000';
  process.env.EXPO_PUBLIC_DEMO_ENABLED = 'false';
  expect(() => configure({ config: {} })).toThrow(/HTTPS/);
  process.env.EXPO_PUBLIC_API_URL = 'https://api.example.edu';
  process.env.EXPO_PUBLIC_DEMO_ENABLED = 'true';
  expect(() => configure({ config: {} })).toThrow(/DEMO_ENABLED/);
});

test('production retains native identity and includes splash and signing configuration', () => {
  process.env.APP_ENV = 'production';
  process.env.EXPO_PUBLIC_API_URL = 'https://api.example.edu';
  process.env.EXPO_PUBLIC_DEMO_ENABLED = 'false';
  const result = configure({ config: { android: { package: 'com.mediaops.staff' } } });
  expect(result.android.package).toBe('com.mediaops.staff');
  expect(result.plugins).toContainEqual(['./plugins/with-release-signing', { production: true }]);
  expect(result.plugins.some((plugin: any) => plugin[0] === 'expo-splash-screen')).toBe(true);
});
