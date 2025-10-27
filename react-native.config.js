// react-native.config.js
module.exports = {
  dependencies: {
    'uilib-native': {
      platforms: { ios: null, android: null }, // <- disable native linking
    },
  },
};