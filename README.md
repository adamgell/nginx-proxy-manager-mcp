# Nginx Proxy Manager MCP Server

An MCP (Model Context Protocol) server that provides tools for interacting with the Nginx Proxy Manager API.

## Features

- Full API coverage for Nginx Proxy Manager v2.12.3
- Proxy host management (create, update, delete, enable/disable)
- SSL certificate management (Let's Encrypt and custom certificates)
- Access list management
- User management
- Stream management
- Settings and reports

## Installation

```bash
npm install nginx-proxy-manager-mcp
```

## Configuration

Set the following environment variables:

- `NPM_BASE_URL`: The base URL of your Nginx Proxy Manager API (default: `http://localhost:81/api`)

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "nginx-proxy-manager": {
      "command": "npx",
      "args": ["nginx-proxy-manager-mcp"],
      "env": {
        "NPM_BASE_URL": "http://192.168.2.4/api"
      }
    }
  }
}
```

## Available Tools

### Authentication
- `npm_authenticate` - Authenticate with NPM using username/email and password

### Proxy Hosts
- `npm_list_proxy_hosts` - List all proxy hosts
- `npm_get_proxy_host` - Get a specific proxy host
- `npm_create_proxy_host` - Create a new proxy host
- `npm_update_proxy_host` - Update an existing proxy host
- `npm_delete_proxy_host` - Delete a proxy host
- `npm_enable_proxy_host` - Enable a proxy host
- `npm_disable_proxy_host` - Disable a proxy host

### Certificates
- `npm_list_certificates` - List all certificates
- `npm_create_certificate` - Create a new certificate (Let's Encrypt or custom)
- `npm_renew_certificate` - Renew a Let's Encrypt certificate
- `npm_delete_certificate` - Delete a certificate

### Access Lists
- `npm_list_access_lists` - List all access lists
- `npm_create_access_list` - Create a new access list
- `npm_update_access_list` - Update an access list
- `npm_delete_access_list` - Delete an access list

### Reports
- `npm_get_hosts_report` - Get statistics on all host types

## Example Usage

### Create a Proxy Host

```typescript
// Tool: npm_create_proxy_host
{
  "domain_names": ["app.example.com"],
  "forward_scheme": "http",
  "forward_host": "192.168.1.100",
  "forward_port": 8080,
  "ssl_forced": true,
  "certificate_id": "new",
  "http2_support": true,
  "block_exploits": true
}
```

### Create a Let's Encrypt Certificate

```typescript
// Tool: npm_create_certificate
{
  "provider": "letsencrypt",
  "domain_names": ["app.example.com"],
  "meta": {
    "letsencrypt_email": "admin@example.com",
    "letsencrypt_agree": true
  }
}
```

### Create an Access List

```typescript
// Tool: npm_create_access_list
{
  "name": "Admin Access",
  "satisfy_any": false,
  "pass_auth": true,
  "items": [
    {
      "username": "admin",
      "password": "securepassword"
    }
  ],
  "clients": [
    {
      "address": "192.168.1.0/24",
      "directive": "allow"
    }
  ]
}
```

## Development

```bash
# Clone the repository
git clone <repository-url>
cd nginx-proxy-manager-mcp

# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev
```

## API Coverage

This MCP server covers the following Nginx Proxy Manager API endpoints:

- ✅ Proxy Hosts
- ✅ SSL Certificates
- ✅ Access Lists
- ✅ Users (partial - main operations)
- ✅ Streams (partial - main operations)
- ✅ Reports
- ⚠️ Redirection Hosts (not implemented yet)
- ⚠️ 404 Hosts (not implemented yet)
- ⚠️ Audit Log (not implemented yet)

## Security Notes

- Always use HTTPS for your NPM API endpoint in production
- Store credentials securely
- The MCP server requires authentication before performing any operations
- API tokens expire and need to be refreshed

## License

MIT
