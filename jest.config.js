module.exports = {
  preset: 'ts-jest',
  testEnvironment: "node",
  testMatch: ["**/src/tests/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  moduleFileExtensions: ["ts", "js", "json", "node"],
  moduleNameMapper: {
    "nodemailer": "<rootDir>/src/__mocks__/nodemailer.ts",
  },
};
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
};
