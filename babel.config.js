module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated/plugin doit rester en dernier dans la liste des plugins.
    plugins: ['react-native-reanimated/plugin'],
  };
};
