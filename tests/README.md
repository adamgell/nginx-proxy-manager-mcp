# Testing Infrastructure for nginx-proxy-manager-mcp

This directory contains comprehensive testing infrastructure for the nginx-proxy-manager-mcp project.

## Overview

The testing suite includes:
- Unit tests for core functionality
- Integration tests with real NPM instance
- Stress tests to replicate production issues
- Docker-based isolated test environment

## Quick Start

### Running All Tests
```bash
# Run complete test suite with Docker environment
./run-full-tests.sh

# Run on docker02 or similar environments
./test-on-docker02.sh
```

### Running Specific Tests

#### Unit Tests (No NPM Required)
```bash
npm test tests/unit.test.ts
```

#### Integration Tests
```bash
# Start test environment first
./start-test-env.sh

# Run integration tests
npm test tests/integration/full-system.test.ts

# Run stress test
NPM_TEST_URL=http://localhost:9181/api npx tsx tests/integration/stress-test.ts
```

## Test Environment

The test environment uses Docker Compose to spin up:
- **MariaDB 10.11**: Database backend
- **NPM 2.11.3**: Nginx Proxy Manager instance

### Configuration
- NPM URL: `http://localhost:9181/api`
- Admin Email: `admin@test.local`
- Admin Password: `changeme123`

### Docker Compose File
See `docker-compose.full-test.yml` for the complete configuration.

## Test Structure

### Unit Tests (`tests/unit.test.ts`)
- Basic Jest configuration
- Environment variable validation
- Schema validation logic
- Tool naming conventions
- Error handling patterns

### Integration Tests (`tests/integration/full-system.test.ts`)
- Complete CRUD operations for all resource types
- Error handling scenarios
- Performance tests
- Concurrent operation handling

### Stress Test (`tests/integration/stress-test.ts`)
- Replicates production issues
- Tests all API endpoints
- Provides success rate metrics
- Compares with known production failures

## Scripts

### `run-full-tests.sh`
Main test runner that:
- Manages Docker containers
- Runs all test suites
- Collects logs and reports
- Generates summary reports

### `start-test-env.sh`
Standalone script to start test environment:
- Checks port availability
- Ensures clean container state
- Waits for services to be ready
- Displays connection information

### `test-on-docker02.sh`
Specialized script for docker02 environment:
- Handles containerized environments
- Checks all dependencies
- Runs appropriate test subsets
- Provides clear success/failure status

## Test Data

### Fixtures (`tests/fixtures/test-data.json`)
Pre-configured test data including:
- Test users
- Proxy host configurations
- Redirection hosts
- Dead hosts (404 pages)
- Access lists
- Certificates

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Find processes using test ports
   lsof -i :9181
   lsof -i :8181
   
   # Stop conflicting containers
   docker ps -q --filter "publish=9181" | xargs docker stop
   ```

2. **Authentication Failures**
   - Ensure NPM is fully started (check logs)
   - Verify correct credentials in test config
   - Check database initialization

3. **Container Issues**
   ```bash
   # View container logs
   docker logs npm-test-app
   docker logs npm-test-db
   
   # Reset everything
   docker-compose -f docker-compose.full-test.yml down -v
   ```

## Known Issues

1. **TypeScript Warnings**: Some type warnings in integration tests don't affect functionality
2. **Socket Timeouts**: Occasional timeouts under heavy load are expected
3. **macOS Compatibility**: Scripts adapted for macOS-specific commands

## CI/CD Integration

These tests are designed to run in:
- Local development environments
- GitHub Actions
- Docker-based CI systems
- Production-like environments (docker02)

## Contributing

When adding new tests:
1. Follow existing patterns
2. Update test data fixtures as needed
3. Ensure tests are idempotent
4. Clean up created resources
5. Document any special requirements