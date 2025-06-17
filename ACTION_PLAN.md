# Action Plan for Regression Fix

## Current Situation

### Version Comparison
| Component | Dev Machine | Test Machine (docker02) | Issue? |
|-----------|------------|------------------------|---------|
| nginx-proxy-manager-mcp | **1.1.2** | **1.1.1** | ❌ Outdated |
| axios | 1.10.0 | 1.10.0 | ✅ Same |
| @modelcontextprotocol/sdk | 0.5.0 | 0.5.0 | ✅ Same |
| zod | 3.25.64 | 3.25.64 | ✅ Same |

## Step-by-Step Fix

### 1. Update MCP on Testing Machine (docker02.gell.one)
```bash
# SSH into docker02.gell.one
ssh docker02.gell.one

# Navigate to the project directory
cd /home/adam/docker-env-20250613-185351

# Install the latest version
npm install nginx-proxy-manager-mcp@1.1.2

# Verify installation
npm list nginx-proxy-manager-mcp
```

### 2. Test with v1.1.2
Run the stress test again to see if the bug fixes in v1.1.2 help:
- Certificate ID validation fix
- Access list error handling
- Audit log pagination
- Dead host boolean conversion

### 3. If Issues Persist - Downgrade Axios
If v1.1.2 doesn't fix the issues, downgrade axios on BOTH machines:

```bash
# On docker02.gell.one
cd /home/adam/docker-env-20250613-185351
npm install axios@1.6.0 --save

# On dev machine
cd /Users/adam.gell/Documents/GitHub/nginx-proxy-manager-mcp
npm install axios@1.6.0 --save-exact
```

### 4. If Still Failing - Server Investigation
The pattern strongly suggests server-side issues:
- All READ operations work ✅
- All WRITE operations fail ❌
- Authentication works ✅

Check NPM server:
```bash
# Check NPM container logs
docker logs nginx-proxy-manager-mcp-npm-1

# Restart NPM container
docker restart nginx-proxy-manager-mcp-npm-1

# Check database connectivity
docker exec nginx-proxy-manager-mcp-npm-1 ping db
```

## Expected Outcomes

### After v1.1.2 Update
The following should be fixed:
1. Certificate ID type validation errors
2. Access list expand parameter handling
3. Better error messages for failures

### After Axios Downgrade (if needed)
Should restore compatibility if axios 1.10.0 introduced breaking changes.

## Key Insight

The regression coincided with npm updates, but since both machines have the same axios version (1.10.0), the issue is likely:
1. **NPM server degradation** after updates
2. **v1.1.1 bugs** that are fixed in v1.1.2
3. **Environmental factors** in the Docker setup

## Priority Actions

1. **FIRST**: Update to v1.1.2 on docker02.gell.one
2. **TEST**: Run stress test again
3. **IF NEEDED**: Downgrade axios to 1.6.0
4. **INVESTIGATE**: NPM server logs if issues persist