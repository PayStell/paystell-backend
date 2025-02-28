# Test Setup Guide

## Setting up the Test Environment
1. Install dependencies: `npm install`
2. Start the test database: `npm run test-db-setup`
3. Run tests: `npm test`

## Mock Services
- Stellar interactions are mocked in `src/mocks/stellarMock.ts`
- Email service is mocked in `src/mocks/emailMock.ts`
- External API calls are mocked in `src/mocks/apiMock.ts`

## CI/CD Integration
- Tests are automatically run in GitHub Actions via `.github/workflows/integration-tests.yml`
```

# coverage/
_(Generated after running tests)_