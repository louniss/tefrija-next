module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      // Cloudflare Worker: separate deploy target, own runtime globals.
      files: ['worker.js'],
      env: {serviceworker: true},
      rules: {'no-bitwise': 'off'},
    },
    {
      // Node build scripts (not shipped in the app bundle).
      files: ['scripts/**/*.js'],
      env: {node: true},
      parserOptions: {ecmaVersion: 2022, sourceType: 'script'},
    },
  ],
};
