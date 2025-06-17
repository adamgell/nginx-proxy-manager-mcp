# Regression Analysis - NPM MCP v1.1.2

## Issue Summary
After npm package updates, the MCP tools experienced a 27.5% degradation in functionality (from 92.5% to 65% success rate).

## Root Cause Analysis

### Package Version Changes
- **axios**: Updated from ^1.6.0 to 1.10.0 (major version jump)
- **zod**: Updated from ^3.22.0 to 3.25.64
- This happened when running `npm update -g` which may have affected local packages

### Failed Operations Pattern
All failing operations are WRITE operations:
- DELETE: Proxy hosts, Access lists
- CREATE: Redirection hosts, Dead hosts  
- UPDATE: Access lists, Dead hosts
- ENABLE/DISABLE: Dead hosts

READ operations continue to work correctly.

## Likely Causes

### 1. Axios Breaking Changes
Axios 1.10.0 may have introduced breaking changes in:
- Request/response interceptors
- Error handling
- Header management
- Request body serialization

### 2. Server-Side vs Client-Side
The pattern suggests this is NOT a server-side issue because:
- Authentication works (server is responding)
- READ operations work (server processes GET requests)
- Only WRITE operations fail (POST/PUT/DELETE)

This points to a client-side issue with how requests are formatted.

## Immediate Actions

### 1. Rollback Axios Version
```bash
npm install axios@1.6.0 --save-exact
```

### 2. Test with Fixed Version
After rollback, test the failing operations again.

### 3. Review Axios Changelog
Check axios changelog for breaking changes between 1.6.0 and 1.10.0.

## Long-term Fixes

### 1. Pin Dependencies
Use exact versions in package.json:
```json
"dependencies": {
  "@modelcontextprotocol/sdk": "0.5.0",
  "axios": "1.6.0",
  "commander": "14.0.0",
  "zod": "3.22.0",
  "zod-to-json-schema": "3.24.5"
}
```

### 2. Add Integration Tests
Create integration tests that run against a real NPM instance to catch regressions.

### 3. Version Compatibility Matrix
Document which versions of dependencies are tested and known to work.

## Error Pattern Analysis

### 500 Errors (Server Internal Error)
- Suggests malformed requests that crash server processing
- Likely due to changed request format from axios

### 400 Errors (Bad Request)
- Indicates invalid request format
- Confirms client-side issue with request construction

### Working Operations
- All GET requests work
- Authentication (POST with specific format) works
- This confirms server is healthy

## Conclusion

This is a client-side regression caused by axios version update. The fix is to rollback to axios 1.6.0 and pin dependency versions to prevent future auto-updates.