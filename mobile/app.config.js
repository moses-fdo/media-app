const { URL } = require('node:url');

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
  return {
    ...config,
    icon: './assets/images/media-ops-icon.png',
    android: {
      ...config.android,
      adaptiveIcon: {
        foregroundImage: './assets/images/media-ops-mark.png',
        monochromeImage: './assets/images/media-ops-mark.png',
        backgroundColor: '#F8F8F5',
      },
    },
    web: { ...config.web, favicon: './assets/images/media-ops-icon.png' },
    plugins: [
      ...(config.plugins || []),
      ['expo-splash-screen', {
        image: './assets/images/media-ops-mark.png', imageWidth: 180,
        resizeMode: 'contain', backgroundColor: '#F8F8F5',
        dark: { image: './assets/images/media-ops-mark.png', backgroundColor: '#16191E' },
      }],
      ['./plugins/with-release-signing', { production }],
    ],
  };
};
