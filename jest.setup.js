/* eslint-disable no-undef */
// AsyncStorage mock for unit tests (guest repository + session persistence).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Silence noisy Reanimated / native warnings if they appear in the future.
global.__DEV__ = true;
