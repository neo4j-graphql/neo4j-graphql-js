module.exports = {
  plugins: ['jest'],
  env: {
    es6: true,
    node: true,
    'jest/globals': true
  },
  extends: 'airbnb-base',
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  rules: {
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error',
    'import/no-extraneous-dependencies': [
      'error',
      { devDependencies: ['db/**/*.js', '**/*.test.js', '**/*.spec.js'] }
    ]
  }
};
