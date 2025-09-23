/**
 * Jest configuration for frontend tests
 */
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/ratemyrations/static/src/__tests__/setup.js'],
  testMatch: [
    '<rootDir>/ratemyrations/static/src/__tests__/**/*.test.js'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/ratemyrations/static/src/$1'
  },
  collectCoverageFrom: [
    'ratemyrations/static/src/**/*.js',
    '!ratemyrations/static/src/__tests__/**',
    '!ratemyrations/static/src/**/*.test.js'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: '<rootDir>/coverage',
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(esbuild)/)'
  ]
};
