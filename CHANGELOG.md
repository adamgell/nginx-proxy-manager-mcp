# Changelog

## [1.1.2] - 2025-01-17

### Fixed
- **Certificate ID validation**: Fixed type validation issue where numeric certificate IDs in JSON parameters were causing errors. Now properly handles numbers, numeric strings, and the special "new" value.
- **Access List expansion error**: Added graceful fallback when server returns 500 error with expand parameter. The tool now automatically retries without expansion and notifies the user.
- **Audit Log pagination**: Added pagination support to handle large audit logs that exceed token limits. New optional `limit` and `offset` parameters control the response size.
- **Dead Host boolean handling**: Fixed boolean type inconsistency where dead hosts expect numeric values (0/1) instead of true/false. Boolean values are now automatically converted.

### Changed
- Enhanced error handling for server-side issues
- Improved type validation for better compatibility with NPM API quirks

## [1.1.1] - 2025-01-17

### Added
- Comprehensive unit test coverage for all functions
- Tests for redirection hosts, dead hosts, and audit log
- New test file for npm-direct-tools CLI functionality

### Fixed
- Missing CLI command implementations for access lists and certificates
- Updated help output to include all available commands

## [1.1.0] - 2025-01-16

### Added
- Direct NPM access tools for CLI usage without MCP overhead
- Session persistence for authentication tokens
- Enhanced debug logging with NPM_MCP_DEBUG environment variable
- Authentication status tracking with token expiry
- Support for dynamic baseUrl updates
- Redirection hosts management (list, get, create, update, delete, enable, disable)
- Dead hosts (404 pages) management
- Audit log access

### Changed
- Improved error handling with detailed status codes and messages
- Better authentication state management

## [1.0.0] - Initial Release

### Added
- Full MCP server implementation for Nginx Proxy Manager
- Support for proxy hosts, certificates, and access lists
- Authentication via bearer tokens
- Comprehensive API coverage