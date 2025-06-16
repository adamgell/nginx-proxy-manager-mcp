# Direct NPM Access

Now you can use NPM tools directly without creating JS files!

## Quick Start

1. **Authenticate** (one-time setup):
```bash
NPM_BASE_URL=http://192.168.2.4:81/api node dist/npm-direct-tools.js authenticate me@adamgell.com wfy6gfa8EVB_gzy0gwh
```

2. **Use any NPM command directly**:
```bash
# Check authentication status
NPM_BASE_URL=http://192.168.2.4:81/api node dist/npm-direct-tools.js auth-status

# List all proxy hosts
NPM_BASE_URL=http://192.168.2.4:81/api node dist/npm-direct-tools.js list-proxy-hosts

# Get specific proxy host
NPM_BASE_URL=http://192.168.2.4:81/api node dist/npm-direct-tools.js get-proxy-host 22

# List certificates
NPM_BASE_URL=http://192.168.2.4:81/api node dist/npm-direct-tools.js list-certificates
```

## Available Commands

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

## Examples

### Create a new proxy host
```bash
NPM_BASE_URL=http://192.168.2.4:81/api node dist/npm-direct-tools.js create-proxy-host '{
  "domain_names": ["test.example.com"],
  "forward_scheme": "http",
  "forward_host": "localhost",
  "forward_port": 3000,
  "ssl_forced": false,
  "block_exploits": true,
  "caching_enabled": false,
  "allow_websocket_upgrade": true,
  "enabled": true
}'
```

### Enable/Disable a proxy host
```bash
# Disable
NPM_BASE_URL=http://192.168.2.4:81/api node dist/npm-direct-tools.js disable-proxy-host 32

# Enable
NPM_BASE_URL=http://192.168.2.4:81/api node dist/npm-direct-tools.js enable-proxy-host 32
```

## Session Management

- Authentication tokens are saved in a temporary file and persist for 1 hour
- No need to re-authenticate for each command
- Session is automatically loaded for each command

## Global Installation

For easier access, you can install globally:
```bash
npm install -g .
```

Then use directly:
```bash
NPM_BASE_URL=http://192.168.2.4:81/api npm-direct authenticate me@adamgell.com yourpassword
NPM_BASE_URL=http://192.168.2.4:81/api npm-direct list-proxy-hosts
```

Or set the base URL in your environment:
```bash
export NPM_BASE_URL=http://192.168.2.4:81/api
npm-direct list-proxy-hosts
```