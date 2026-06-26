module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 (SDK 54) : le plugin vit désormais dans react-native-worklets.
    // Il doit rester en dernier dans la liste des plugins.
    plugins: ['react-native-worklets/plugin'],
  };
};
