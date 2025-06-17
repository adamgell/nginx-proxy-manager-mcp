# GitHub Release - v1.1.2

## What's Changed

### 🐛 Bug Fixes
- Fix certificate_id type validation to accept numeric strings by @adamgell
- Add graceful fallback for access list 500 errors by @adamgell  
- Implement pagination for audit log responses by @adamgell
- Convert boolean values to numeric for dead host compatibility by @adamgell

### ✅ Testing
- Add comprehensive unit tests for all functions by @adamgell
- Create test suite for npm-direct-tools CLI by @adamgell

### 📚 Documentation
- Update CLAUDE.md with all new CLI commands by @adamgell
- Add CHANGELOG.md for version history by @adamgell

## Installation

```bash
npm install nginx-proxy-manager-mcp@1.1.2
```

Or update existing installation:

```bash
npm update nginx-proxy-manager-mcp
```

## Full Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed changes.

**Full Changelog**: https://github.com/adamgell/nginx-proxy-manager-mcp/compare/v1.1.1...v1.1.2

## Release Verification

This release was tested against a live Nginx Proxy Manager v2.11.3 instance with all 33 MCP functions verified working.