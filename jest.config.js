module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!(@react-navigation|react-native|@react-native|react-native-markdown-display)/)',
  ],
};
