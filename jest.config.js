module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globalSetup: './tests/setup.js',
  globalTeardown: './tests/teardown.js',
  testTimeout: 10000,
}