# MCP Integration Guide

## Understanding MCP Tool Access

The Model Context Protocol (MCP) server for Nginx Proxy Manager runs as a separate process that communicates via stdio. This creates a specific architecture where:

1. **MCP Server Process**: The nginx-proxy-manager-mcp runs as an independent process
2. **Client Application**: Applications like Claude Desktop connect to the MCP server
3. **Tool Registration**: The server exposes tools through the MCP protocol

## Why Direct Tool Access Isn't Available

When running in the Claude Code CLI environment, MCP tools from external servers aren't automatically integrated into the available toolset. This is because:

- MCP servers communicate through stdio (standard input/output)
- Each MCP server is a separate process with its own protocol handling
- The Claude Code CLI has its own set of built-in tools
- External MCP servers need proper client-server connections

## Improvements Made in v1.1.0

### 1. Authentication State Management
- Token persistence across tool calls
- Automatic token expiry tracking (1 hour)
- Clear authentication status checking with `npm_auth_status` tool
- Better error messages when authentication is required

### 2. Enhanced Logging
- Debug mode via `NPM_MCP_DEBUG=true` environment variable
- Request/response logging for troubleshooting
- Detailed error reporting

### 3. Better Error Handling
- Specific error messages for authentication failures
- HTTP status code translation
- Graceful handling of API errors

### 4. New Features
- `npm_auth_status` tool to check authentication state
- Improved tool descriptions
- Better parameter validation

## Usage with Claude Desktop

To use the MCP tools with Claude Desktop:

1. Configure your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "nginx-proxy-manager": {
      "command": "nginx-proxy-manager-mcp",
      "env": {
        "NPM_BASE_URL": "http://your-npm-instance:81/api"
      }
    }
  }
}
```

2. The tools will be available with these names:
- `npm_authenticate` - Authenticate with NPM (required first)
- `npm_auth_status` - Check authentication status
- `npm_list_proxy_hosts` - List all proxy hosts
- `npm_get_proxy_host` - Get specific proxy host
- `npm_create_proxy_host` - Create new proxy host
- `npm_update_proxy_host` - Update proxy host
- `npm_delete_proxy_host` - Delete proxy host
- `npm_enable_proxy_host` - Enable proxy host
- `npm_disable_proxy_host` - Disable proxy host
- `npm_list_certificates` - List SSL certificates
- `npm_create_certificate` - Create certificate
- `npm_renew_certificate` - Renew certificate
- `npm_delete_certificate` - Delete certificate
- And many more...

## Debug Mode

Enable debug logging:
```bash
NPM_MCP_DEBUG=true nginx-proxy-manager-mcp
```

This will show:
- All API requests and responses
- Authentication flow
- Tool invocations
- Error details

## Direct API Access

When MCP tools aren't available (like in CLI environments), you can use the NPM API directly:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://your-npm:81/api',
  headers: { 'Content-Type': 'application/json' }
});

// Authenticate
const { data } = await api.post('/tokens', {
  identity: 'your-email@example.com',
  secret: 'your-password'
});

// Use token for subsequent requests
api.defaults.headers.Authorization = `Bearer ${data.token}`;

// List proxy hosts
const hosts = await api.get('/nginx/proxy-hosts');
```

## Architecture Diagram

```
┌─────────────────┐     stdio      ┌──────────────────┐
│ Claude Desktop  │◄──────────────►│  NPM MCP Server  │
│   (MCP Client)  │                │    (Process)     │
└─────────────────┘                └──────────────────┘
                                            │
                                            │ HTTP API
                                            ▼
                                   ┌──────────────────┐
                                   │ Nginx Proxy Mgr  │
                                   │   (NPM API)      │
                                   └──────────────────┘
```

## Testing

Run the integration tests:
```bash
npm test
```

For full integration testing with a real NPM instance:
```bash
npm run test:integration
```