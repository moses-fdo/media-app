const { withAppBuildGradle, withAndroidManifest } = require('expo/config-plugins');

module.exports = (config, { production = false } = {}) => {
  config = withAndroidManifest(config, config => {
    const app = config.modResults.manifest.application?.[0];
    if (app) app.$['android:usesCleartextTraffic'] = production ? 'false' : 'true';
    return config;
  });
  // EAS injects its managed signing credentials separately; local builds use our env keys.
  if (!production || process.env.EAS_BUILD === 'true') return config;
  return withAppBuildGradle(config, config => {
    // Signing secrets are read at build time, never copied into generated source.
    const source = config.modResults.contents;
    const anchor = 'signingConfigs {';
    const block = `
        release {
            def names = ['MEDIAOPS_KEYSTORE_PATH', 'MEDIAOPS_KEYSTORE_PASSWORD', 'MEDIAOPS_KEY_ALIAS', 'MEDIAOPS_KEY_PASSWORD']
            names.each { name -> if (!System.getenv(name)) throw new GradleException("Missing release signing environment variable: " + name) }
            storeFile file(System.getenv('MEDIAOPS_KEYSTORE_PATH'))
            storePassword System.getenv('MEDIAOPS_KEYSTORE_PASSWORD')
            keyAlias System.getenv('MEDIAOPS_KEY_ALIAS')
            keyPassword System.getenv('MEDIAOPS_KEY_PASSWORD')
        }
`;
    if (!source.includes('MEDIAOPS_KEYSTORE_PATH')) {
      if (!source.includes(anchor)) throw new Error('Cannot locate Android signing configuration.');
      const releaseIndex = source.indexOf('buildTypes {');
      if (releaseIndex < 0) throw new Error('Cannot locate Android build types.');
      const before = source.slice(0, releaseIndex);
      const after = source.slice(releaseIndex).replace(/(release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/, '$1signingConfig signingConfigs.release');
      if (after === source.slice(releaseIndex)) throw new Error('Cannot replace Android debug release signing.');
      config.modResults.contents = (before + after).replace(anchor, anchor + block);
    }
    return config;
  });
};
