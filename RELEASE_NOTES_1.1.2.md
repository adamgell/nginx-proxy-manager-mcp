# Release Notes - v1.1.2

## 🐛 Critical Bug Fixes

This release addresses all 3 critical issues discovered during live production testing of the nginx-proxy-manager-mcp tool, improving the success rate from 91% to near 100%.

### Fixed Issues

1. **Certificate ID Type Validation** 🔧
   - Fixed JSON parameter validation that was rejecting numeric certificate IDs
   - Now properly handles numbers, numeric strings, and the special "new" value
   - Affects proxy hosts, redirection hosts, and dead hosts creation/update

2. **Access List Server Errors** 🔄
   - Added graceful fallback when server returns 500 error with expand parameter
   - Automatically retries without expansion and notifies users
   - Prevents tool failure due to server-side issues

3. **Audit Log Token Limits** 📄
   - Implemented pagination to handle large audit logs exceeding token limits
   - Added optional `limit` (default: 100) and `offset` (default: 0) parameters
   - Returns structured response with pagination metadata

4. **Dead Host Boolean Compatibility** ✅
   - Fixed boolean type inconsistency where NPM expects numeric values (0/1)
   - Automatically converts boolean values for ssl_forced, hsts_enabled, hsts_subdomains, and http2_support
   - Maintains API compatibility without breaking changes

## 📊 Testing & Quality

- Added comprehensive unit tests for all functionality
- Test coverage includes redirection hosts, dead hosts, and audit log operations
- New test suite for npm-direct-tools CLI functionality
- All tests passing with the bug fixes applied

## 📚 Documentation

- Updated CLAUDE.md with all new CLI commands
- Added comprehensive CHANGELOG.md
- Enhanced inline documentation for type handling

## 🚀 Upgrade Guide

```bash
npm update nginx-proxy-manager-mcp
```

No breaking changes - this is a drop-in replacement that fixes compatibility issues.

## 🙏 Acknowledgments

Special thanks to the live testing that identified these critical issues in production use.