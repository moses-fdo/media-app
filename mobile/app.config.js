const { URL } = require('node:url');
const fs = require('node:fs');
const path = require('node:path');

module.exports = ({ config }) => {
  const production = process.env.APP_ENV === 'production' || process.env.EAS_BUILD_PROFILE === 'production';
  if (production) {
    let api;
    try { api = new URL(process.env.EXPO_PUBLIC_API_URL); } catch { throw new Error('Production requires EXPO_PUBLIC_API_URL with your deployed HTTPS API origin.'); }
    if (api.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1', '[::1]'].includes(api.hostname)) {
      throw new Error('Production requires a public HTTPS API origin, not localhost.');
    }
    if (process.env.EXPO_PUBLIC_DEMO_ENABLED !== 'false') {
      throw new Error('Set EXPO_PUBLIC_DEMO_ENABLED=false for production.');
    }
  }
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON === 'none' ? undefined : (process.env.GOOGLE_SERVICES_JSON || config.android?.googleServicesFile || (fs.existsSync(path.join(__dirname, 'google-services.json')) ? './google-services.json' : undefined));
  if (googleServicesFile) {
    let firebase;
    try { firebase = JSON.parse(fs.readFileSync(path.resolve(__dirname, googleServicesFile), 'utf8')); }
    catch { throw new Error('Cannot read Firebase google-services.json. Download the Android app configuration from Firebase.'); }
    const packageName = config.android?.package || 'com.mediaops.staff';
    const client = firebase.client?.find(item => item.client_info?.android_client_info?.package_name === packageName);
    if (!client) throw new Error(`Firebase google-services.json must contain the Android package ${packageName}.`);
    if (!firebase.project_info?.project_number || !client.client_info?.mobilesdk_app_id || !client.api_key?.some(key => key.current_key)) {
      throw new Error('Firebase google-services.json is incomplete. Download a fresh Android app configuration from Firebase.');
    }
  }
  if ((process.env.REQUIRE_ANDROID_PUSH === 'true' || process.env.EAS_BUILD_PLATFORM === 'android') && !googleServicesFile) {
    throw new Error('Android push notifications require google-services.json. Add mobile/google-services.json or set GOOGLE_SERVICES_JSON to its path before building.');
  }
  return {
    ...config,
    extra: { ...config.extra, notifications: { androidConfigured: !!googleServicesFile } },
    icon: './assets/images/karunya-k-icon.png',
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
      adaptiveIcon: {
        foregroundImage: './assets/images/karunya-k-adaptive.png',
        monochromeImage: './assets/images/karunya-k-monochrome.png',
        backgroundColor: '#F8F8F5',
      },
    },
    web: { ...config.web, favicon: './assets/images/karunya-k-favicon.png' },
    plugins: [
      ...(config.plugins || []),
      ['expo-splash-screen', {
        image: './assets/images/karunya-k-mark.png', imageWidth: 180,
        resizeMode: 'contain', backgroundColor: '#F8F8F5',
        dark: { image: './assets/images/karunya-k-mark.png', backgroundColor: '#16191E' },
      }],
      ['./plugins/with-release-signing', { production }],
    ],
  };
};
