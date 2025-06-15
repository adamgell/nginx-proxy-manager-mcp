# Testing nginx-proxy-manager-mcp

This guide provides a repeatable process for testing the nginx-proxy-manager-mcp server.

## Prerequisites

- Nginx Proxy Manager instance running and accessible
- Node.js and npm installed
- MCP server built (`npm run build`)

## Test Procedure

### 1. Set Environment Variables

```bash
export NPM_BASE_URL="http://your-npm-instance:81/api"
```

### 2. Run the MCP Server

In Claude Desktop, ensure your configuration includes:

```json
{
  "mcpServers": {
    "nginx-proxy-manager": {
      "command": "npx",
      "args": ["nginx-proxy-manager-mcp"],
      "env": {
        "NPM_BASE_URL": "http://your-npm-instance:81/api"
      }
    }
  }
}
```

### 3. Test Authentication

Use the `npm_authenticate` tool with your NPM credentials:
- **identity**: your-email@example.com
- **secret**: your-password

Expected output in stdout:
```
[NPM-MCP] Tool called: npm_authenticate
[NPM-MCP] Authenticating with identity: your-email@example.com
[NPM-MCP] Authentication successful! Token: <jwt-token>
[NPM-MCP] Token expires: <timestamp>
```

### 4. List Proxy Hosts

Use the `npm_list_proxy_hosts` tool to verify connection.

Expected output in stdout:
```
[NPM-MCP] Tool called: npm_list_proxy_hosts
[NPM-MCP] GET /nginx/proxy-hosts
[NPM-MCP] Found X proxy hosts
```

### 5. Create Test Proxy

Use the `npm_create_proxy_host` tool with:
```json
{
  "domain_names": ["test.example.com"],
  "forward_scheme": "http",
  "forward_host": "127.0.0.1",
  "forward_port": 81,
  "block_exploits": true,
  "ssl_forced": false
}
```

### 6. Verify Proxy Works

Test the created proxy:
```bash
curl -I http://test.example.com
```

Expected response:
```
HTTP/1.1 200 OK
server: openresty
x-served-by: test.example.com
```

### 7. Cleanup (Optional)

Use `npm_delete_proxy_host` with the ID returned from creation to remove the test proxy.

## Automated Test Suite

Run the full test suite:

```bash
# Unit tests
npm test

# Integration tests (requires Docker)
npm run test:integration
```

## Troubleshooting

### Authentication Fails
- Verify NPM_BASE_URL includes `/api` suffix
- Check credentials are correct
- Ensure NPM instance is accessible

### No stdout Output
- Rebuild the project: `npm run build`
- Check the server is using the latest compiled version
- Verify Claude Desktop is using the correct MCP server path

### Proxy Not Responding
- Check DNS resolution for test domain
- Verify NPM is running and nginx is reloaded
- Check NPM logs for errors