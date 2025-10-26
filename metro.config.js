// metro.config.js
const { getDefaultConfig } = require('expo/metro-config'); // if using Expo
// or: const { getDefaultConfig } = require('metro-config');

const config = getDefaultConfig(__dirname);

// ✅ Enable require.context
config.transformer.unstable_allowRequireContext = true;

module.exports = config;
