# RateMyRations Comprehensive Test Suite

This directory contains a comprehensive testing suite for the RateMyRations application, covering all aspects of functionality, performance, and reliability.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── test_database.py    # Database function tests
│   ├── test_api.py         # API endpoint tests
│   └── test_performance.py # Performance and load tests
├── integration/            # Integration tests
│   └── test_menu_fetching.py # Menu fetching and API integration
├── e2e/                    # End-to-end tests
│   └── test_frontend.py    # Frontend and browser tests
├── fixtures/               # Test data and fixtures
│   └── test_data.py        # Sample data and generators
├── utils/                  # Test utilities and configuration
│   └── test_config.py      # Test configuration and helpers
├── conftest.py            # Pytest configuration
├── run_tests.py           # Test runner script
└── requirements.txt       # Test dependencies
```

## Test Categories

### Unit Tests (`tests/unit/`)
- **Database Functions**: Test all database operations, retry logic, and data integrity
- **API Endpoints**: Test all Flask routes, validation, error handling, and responses
- **Performance**: Test response times, concurrent operations, and load handling

### Integration Tests (`tests/integration/`)
- **Menu Fetching**: Test Nutrislice API integration, data processing, and caching
- **Data Flow**: Test complete data flow from API to database to frontend

### End-to-End Tests (`tests/e2e/`)
- **Frontend Functionality**: Test user interactions, JavaScript functions, and UI behavior
- **Browser Testing**: Test with real browsers using Selenium WebDriver
- **User Workflows**: Test complete user journeys from rating to viewing results

### Performance Tests (`tests/unit/test_performance.py`)
- **Load Testing**: Test application under concurrent user load
- **Stress Testing**: Test application under extreme conditions
- **Memory Testing**: Test for memory leaks and resource usage
- **Database Performance**: Test database operations under load

## Running Tests

### Prerequisites
```bash
# Install test dependencies
pip install -r tests/requirements.txt

# Install Chrome/ChromeDriver for E2E tests
# On Ubuntu/Debian:
sudo apt-get install google-chrome-stable
sudo apt-get install chromium-chromedriver
```

### Quick Start
```bash
# Run all tests
python tests/run_tests.py

# Run specific test categories
python tests/run_tests.py --unit
python tests/run_tests.py --integration
python tests/run_tests.py --e2e
python tests/run_tests.py --performance

# Run with coverage report
python tests/run_tests.py --coverage

# Run with HTML report
python tests/run_tests.py --html

# Run all tests and checks
python tests/run_tests.py --all
```

### Using pytest directly
```bash
# Run all tests
pytest tests/

# Run specific test file
pytest tests/unit/test_database.py

# Run with coverage
pytest tests/ --cov=ratemyrations --cov-report=html

# Run with verbose output
pytest tests/ -v

# Run specific test
pytest tests/unit/test_database.py::TestDatabaseFunctions::test_add_food -v
```

## Test Configuration

### Environment Variables
The test suite automatically sets up the following environment variables:
- `ADMIN_TOKEN`: Test admin token
- `RATE_LIMIT_DEFAULT`: High rate limit for testing
- `CACHE_MINUTES`: Short cache duration for testing
- `ENABLE_DELETE_RATINGS`: Enabled for testing

### Test Database
- Uses in-memory SQLite database (`:memory:`) for fast, isolated tests
- Automatically creates tables and sample data
- Each test gets a clean database state

### Mocking
- Nutrislice API calls are mocked for consistent testing
- External dependencies are mocked to ensure test reliability
- Database operations use test-specific configurations

## Test Coverage

The test suite aims for comprehensive coverage of:

### Backend Coverage
- ✅ All database functions and operations
- ✅ All API endpoints and routes
- ✅ Error handling and validation
- ✅ Rate limiting and security
- ✅ Caching and performance
- ✅ Admin console functionality

### Frontend Coverage
- ✅ User interface interactions
- ✅ JavaScript functions and logic
- ✅ Local storage management
- ✅ Error handling and user feedback
- ✅ Responsive design
- ✅ Cross-browser compatibility

### Integration Coverage
- ✅ Menu fetching and processing
- ✅ Data flow between components
- ✅ Cache warming and management
- ✅ Concurrent operations
- ✅ External API integration

### Performance Coverage
- ✅ Response time testing
- ✅ Load testing with concurrent users
- ✅ Stress testing under extreme load
- ✅ Memory usage and leak detection
- ✅ Database performance under load

## Test Data

### Sample Data (`tests/fixtures/test_data.py`)
- **Menu Data**: Complete sample menus for all dining halls
- **Ratings Data**: Sample ratings with distributions and aggregations
- **User Data**: Sample users with nicknames and ban status
- **Admin Data**: Sample admin console data

### Dynamic Data Generation
- **Rating Generation**: Random ratings for performance testing
- **User Generation**: Large user datasets for load testing
- **Menu Generation**: Date-specific menu data
- **Large Datasets**: Tools for generating large test datasets

## CI/CD Integration

### GitHub Actions (`.github/workflows/test.yml`)
- **Multi-Python Testing**: Tests on Python 3.9, 3.10, 3.11
- **Linting**: Code quality checks with flake8, black, isort
- **Security Scanning**: Bandit and Safety security checks
- **Coverage Reporting**: Code coverage with Codecov integration
- **E2E Testing**: Browser-based testing with Chrome/ChromeDriver
- **Performance Benchmarking**: Automated performance regression testing

### Test Reports
- **HTML Reports**: Detailed test results with screenshots
- **Coverage Reports**: Code coverage analysis
- **Performance Reports**: Benchmark results and trends
- **Security Reports**: Security vulnerability scans

## Best Practices

### Writing Tests
1. **Isolation**: Each test should be independent and isolated
2. **Clarity**: Test names should clearly describe what is being tested
3. **Coverage**: Aim for high code coverage but focus on critical paths
4. **Performance**: Keep unit tests fast, use separate performance tests for slow operations
5. **Maintenance**: Keep tests up-to-date with code changes

### Test Organization
1. **Grouping**: Group related tests in classes
2. **Fixtures**: Use pytest fixtures for common setup
3. **Data**: Use test fixtures for consistent test data
4. **Mocking**: Mock external dependencies appropriately
5. **Assertions**: Use specific assertions with clear error messages

### Running Tests
1. **Local Development**: Run relevant tests frequently during development
2. **Pre-commit**: Run linting and unit tests before commits
3. **CI/CD**: Let CI/CD run full test suite on pull requests
4. **Performance**: Run performance tests regularly to catch regressions
5. **Coverage**: Monitor coverage trends and maintain high coverage

## Troubleshooting

### Common Issues
1. **ChromeDriver Issues**: Ensure ChromeDriver matches Chrome version
2. **Port Conflicts**: Use different ports for test vs production
3. **Database Locks**: Tests use in-memory database to avoid conflicts
4. **Rate Limiting**: Tests use high rate limits to avoid false failures
5. **Timing Issues**: Use appropriate waits and timeouts

### Debug Mode
```bash
# Run tests with debug output
pytest tests/ -v -s --tb=long

# Run specific test with debug
pytest tests/unit/test_database.py::TestDatabaseFunctions::test_add_food -v -s

# Run with pdb debugger
pytest tests/ --pdb
```

## Contributing

When adding new features:
1. **Write Tests First**: Follow TDD practices
2. **Update Fixtures**: Add new test data as needed
3. **Update Documentation**: Keep this README current
4. **Run Full Suite**: Ensure all tests pass
5. **Check Coverage**: Maintain high test coverage

## Support

For test-related issues:
1. Check the test output for specific error messages
2. Review the test configuration and environment setup
3. Ensure all dependencies are installed correctly
4. Check for port conflicts or resource issues
5. Review the CI/CD logs for automated test failures
