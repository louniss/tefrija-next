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
  ],
};
