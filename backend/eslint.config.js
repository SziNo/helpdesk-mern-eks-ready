const js = require('@eslint/js')
const globals = require('globals')
const { defineConfig } = require('eslint/config')

// ESLint "flat config" a backendhez: Node környezet, CommonJS modulok
module.exports = defineConfig([
  { ignores: ['node_modules/', 'coverage/'] },
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      // Az Express hibakezelőnek 4 paraméter kell (a `next` akkor is, ha nincs használva)
      'no-unused-vars': ['error', { argsIgnorePattern: '^(next|_)' }],
    },
  },
])
