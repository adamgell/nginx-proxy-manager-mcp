# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Direct NPM Access Commands

You now have direct access to Nginx Proxy Manager commands! Here's how to use them:

### First Time Setup (One-time authentication)
```bash
NPM_BASE_URL=http://192.168.2.4:81/api node dist/npm-direct-tools.js authenticate me@adamgell.com wfy6gfa8EVB_gzy0gwh
```

### Available Direct Commands

After authentication, you can use these commands directly:

```bash
# Check authentication status
NPM_BASE_URL=http://192.168.2.4:81/api node dist/npm-direct-tools.js auth-status

# List all proxy hosts
NPM_BASE_URL=http://192.168.2.4:81/api node dist/npm-direct-tools.js list-proxy-hosts

# Get specific proxy host
NPM_BASE_URL=http://192.168.2.4:81/api node dist/npm-direct-tools.js get-proxy-host 22

# Create new proxy host
NPM_BASE_URL=http://192.168.2.4:81/api node dist/npm-direct-tools.js create-proxy-host '{"domain_names":["test.example.com"],"forward_scheme":"http","forward_host":"localhost","forward_port":3000,"enabled":true}'

# Enable/Disable proxy host
NPM_BASE_URL=http://192.168.2.4:81/api node dist/npm-direct-tools.js enable-proxy-host 32
NPM_BASE_URL=http://192.168.2.4:81/api node dist/npm-direct-tools.js disable-proxy-host 32

# Delete proxy host
NPM_BASE_URL=http://192.168.2.4:81/api node dist/npm-direct-tools.js delete-proxy-host 32

# List certificates
NPM_BASE_URL=http://192.168.2.4:81/api node dist/npm-direct-tools.js list-certificates

# Get audit log
NPM_BASE_URL=http://192.168.2.4:81/api node dist/npm-direct-tools.js get-audit-log
```

### All Available Commands

- `authenticate <email> <password>` - Login to NPM (saves session)
- `auth-status` - Check if authenticated
- `list-proxy-hosts [expand]` - List all proxy hosts
- `get-proxy-host <id>` - Get specific proxy host details
- `create-proxy-host <json-data>` - Create new proxy host
- `update-proxy-host <id> <json-data>` - Update proxy host
- `delete-proxy-host <id>` - Delete proxy host
- `enable-proxy-host <id>` - Enable proxy host
- `disable-proxy-host <id>` - Disable proxy host
- `list-certificates [expand]` - List all certificates
- `renew-certificate <id>` - Renew certificate
- `delete-certificate <id>` - Delete certificate
- `list-access-lists [expand]` - List access lists
- `get-hosts-report` - Get hosts statistics
- `get-audit-log` - Get audit log

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

1. **NginxProxyManagerClient** (`src/index.ts:43-287`) - HTTP client wrapper for the Nginx Proxy Manager API
   - Handles authentication via bearer tokens with session management
   - Provides methods for all supported API endpoints
   - Uses axios for HTTP requests
   - Maintains authentication state with token expiry tracking

2. **NginxProxyManagerMCPServer** (`src/index.ts:376-818`) - Main MCP server implementation
   - Registers MCP tools and their schemas
   - Handles tool execution and error management
   - Connects via stdio transport for MCP communication
   - Enhanced with debug logging and better error handling

3. **NPM Direct Tools** (`src/npm-direct-tools.ts`) - Direct CLI interface
   - Provides command-line access without MCP overhead
   - Session persistence in temporary files
   - Simple command structure for easy use

4. **Zod Schemas** (`src/index.ts:290-368`) - Data validation schemas
   - `AuthenticateSchema` - Authentication credentials
   - `ProxyHostSchema` - Proxy host configuration
   - `CertificateSchema` - SSL certificate configuration
   - `AccessListSchema` - Access control list configuration
   - `RedirectionHostSchema` - Redirection host configuration
   - `DeadHostSchema` - 404 host configuration

### API Coverage

The server implements tools for:
- **Authentication** - Token-based authentication with NPM (with session management)
- **Proxy Hosts** - Full CRUD operations plus enable/disable
- **SSL Certificates** - Creation, renewal, and deletion (Let's Encrypt and custom)
- **Access Lists** - CRUD operations for access control
- **Reports** - Host statistics and analytics
- **Redirection Hosts** - Full CRUD operations for redirects
- **Dead Hosts (404)** - Full CRUD operations for 404 pages
- **Audit Log** - Access to audit trail

### Configuration

- Uses environment variable `NPM_BASE_URL` (defaults to `http://localhost:81/api`)
- Requires authentication before API operations
- All API responses are JSON-formatted
- Debug mode available via `NPM_MCP_DEBUG=true`

### Error Handling

- Axios errors are caught and transformed into meaningful messages
- HTTP status codes and response data are included in error messages
- Authentication failures are handled with descriptive error messages
- Session expiry is tracked and reported

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
- All dependencies are production-ready (axios, zod, @modelcontextprotocol/sdk, commander)
- Docker Compose used for consistent testing environment locally and in CI
- Direct CLI tools provide immediate access without MCP overhead

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.