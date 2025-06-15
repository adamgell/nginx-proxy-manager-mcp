# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run build` - Compile TypeScript to JavaScript in the `dist/` directory
- `npm run dev` - Run the MCP server in development mode using tsx
- `npm run start` - Run the compiled server from `dist/index.js`
- `npm install` - Install dependencies
- `npm run prepare` - Automatically runs build (used in npm lifecycle)

## Testing Commands

- `npm test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode for development
- `npm run test:integration` - Full integration test with Docker NPM instance
- `npm run test:setup` - Start Docker Compose test environment only
- `npm run test:teardown` - Stop and cleanup Docker Compose test environment
- `npm run test:ci` - CI-optimized test run with coverage
- `npm run audit` - Security audit of dependencies

## Architecture Overview

This is an MCP (Model Context Protocol) server that provides tools for interacting with the Nginx Proxy Manager API. The project follows a single-file architecture with clear separation of concerns:

### Core Components

1. **NginxProxyManagerClient** (`src/index.ts:14-172`) - HTTP client wrapper for the Nginx Proxy Manager API
   - Handles authentication via bearer tokens
   - Provides methods for all supported API endpoints
   - Uses axios for HTTP requests

2. **NginxProxyManagerMCPServer** (`src/index.ts:226-493`) - Main MCP server implementation
   - Registers MCP tools and their schemas
   - Handles tool execution and error management
   - Connects via stdio transport for MCP communication

3. **Zod Schemas** (`src/index.ts:175-223`) - Data validation schemas
   - `AuthenticateSchema` - Authentication credentials
   - `ProxyHostSchema` - Proxy host configuration
   - `CertificateSchema` - SSL certificate configuration
   - `AccessListSchema` - Access control list configuration

### API Coverage

The server implements tools for:
- **Authentication** - Token-based authentication with NPM
- **Proxy Hosts** - Full CRUD operations plus enable/disable
- **SSL Certificates** - Creation, renewal, and deletion (Let's Encrypt and custom)
- **Access Lists** - CRUD operations for access control
- **Reports** - Host statistics and analytics

### Configuration

- Uses environment variable `NPM_BASE_URL` (defaults to `http://localhost:81/api`)
- Requires authentication before API operations
- All API responses are JSON-formatted

### Error Handling

- Axios errors are caught and transformed into MCP errors
- HTTP status codes and response data are included in error messages
- Authentication failures are handled with descriptive error messages

## Testing Infrastructure

### Local Testing with Docker
- Uses `docker-compose.test.yml` to spin up NPM instance for testing
- Default test credentials: `test@example.com` / `test123456`
- NPM runs on localhost:8181 during tests
- MariaDB backend with test database

### Test Coverage
- **Unit Tests**: Client functionality and error handling
- **Integration Tests**: Full API endpoint testing with real NPM instance
- **MCP Server Tests**: Tool registration and parameter validation
- **GitHub Actions**: Automated testing on every push/PR

### Test Files Structure
- `tests/setup.ts` - Test environment configuration
- `tests/npm-client.test.ts` - NPM API client tests
- `tests/mcp-server.test.ts` - MCP server tool tests

## Development Notes

- The server runs on stdio transport for MCP communication
- TypeScript is compiled to ES2022 with Node16 module resolution
- Uses strict TypeScript configuration with Jest for testing
- All dependencies are production-ready (axios, zod, @modelcontextprotocol/sdk)
- Docker Compose used for consistent testing environment locally and in CI