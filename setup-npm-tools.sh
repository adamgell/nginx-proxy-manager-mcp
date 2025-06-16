#!/bin/bash
# Setup script to create direct NPM command aliases

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Create a bin directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/bin"

# Create wrapper scripts for each NPM command
cat > "$SCRIPT_DIR/bin/npm-auth" << 'EOF'
#!/bin/bash
NPM_BASE_URL="${NPM_BASE_URL:-http://192.168.2.4:81/api}"
node "$SCRIPT_DIR/../dist/npm-direct-tools.js" authenticate "$@"
EOF

cat > "$SCRIPT_DIR/bin/npm-status" << 'EOF'
#!/bin/bash
NPM_BASE_URL="${NPM_BASE_URL:-http://192.168.2.4:81/api}"
node "$SCRIPT_DIR/../dist/npm-direct-tools.js" auth-status
EOF

cat > "$SCRIPT_DIR/bin/npm-list-hosts" << 'EOF'
#!/bin/bash
NPM_BASE_URL="${NPM_BASE_URL:-http://192.168.2.4:81/api}"
node "$SCRIPT_DIR/../dist/npm-direct-tools.js" list-proxy-hosts "$@"
EOF

cat > "$SCRIPT_DIR/bin/npm-get-host" << 'EOF'
#!/bin/bash
NPM_BASE_URL="${NPM_BASE_URL:-http://192.168.2.4:81/api}"
node "$SCRIPT_DIR/../dist/npm-direct-tools.js" get-proxy-host "$@"
EOF

cat > "$SCRIPT_DIR/bin/npm-create-host" << 'EOF'
#!/bin/bash
NPM_BASE_URL="${NPM_BASE_URL:-http://192.168.2.4:81/api}"
node "$SCRIPT_DIR/../dist/npm-direct-tools.js" create-proxy-host "$@"
EOF

cat > "$SCRIPT_DIR/bin/npm-delete-host" << 'EOF'
#!/bin/bash
NPM_BASE_URL="${NPM_BASE_URL:-http://192.168.2.4:81/api}"
node "$SCRIPT_DIR/../dist/npm-direct-tools.js" delete-proxy-host "$@"
EOF

cat > "$SCRIPT_DIR/bin/npm-enable-host" << 'EOF'
#!/bin/bash
NPM_BASE_URL="${NPM_BASE_URL:-http://192.168.2.4:81/api}"
node "$SCRIPT_DIR/../dist/npm-direct-tools.js" enable-proxy-host "$@"
EOF

cat > "$SCRIPT_DIR/bin/npm-disable-host" << 'EOF'
#!/bin/bash
NPM_BASE_URL="${NPM_BASE_URL:-http://192.168.2.4:81/api}"
node "$SCRIPT_DIR/../dist/npm-direct-tools.js" disable-proxy-host "$@"
EOF

cat > "$SCRIPT_DIR/bin/npm-list-certs" << 'EOF'
#!/bin/bash
NPM_BASE_URL="${NPM_BASE_URL:-http://192.168.2.4:81/api}"
node "$SCRIPT_DIR/../dist/npm-direct-tools.js" list-certificates "$@"
EOF

cat > "$SCRIPT_DIR/bin/npm-renew-cert" << 'EOF'
#!/bin/bash
NPM_BASE_URL="${NPM_BASE_URL:-http://192.168.2.4:81/api}"
node "$SCRIPT_DIR/../dist/npm-direct-tools.js" renew-certificate "$@"
EOF

cat > "$SCRIPT_DIR/bin/npm-audit" << 'EOF'
#!/bin/bash
NPM_BASE_URL="${NPM_BASE_URL:-http://192.168.2.4:81/api}"
node "$SCRIPT_DIR/../dist/npm-direct-tools.js" get-audit-log
EOF

# Make all scripts executable
chmod +x "$SCRIPT_DIR/bin/"*

# Fix the SCRIPT_DIR references in the generated scripts
sed -i.bak "s|\$SCRIPT_DIR|$SCRIPT_DIR|g" "$SCRIPT_DIR/bin/"*
rm "$SCRIPT_DIR/bin/"*.bak

echo "NPM tools setup complete!"
echo ""
echo "Available commands:"
echo "  $SCRIPT_DIR/bin/npm-auth <email> <password>  - Authenticate"
echo "  $SCRIPT_DIR/bin/npm-status                   - Check auth status"
echo "  $SCRIPT_DIR/bin/npm-list-hosts               - List proxy hosts"
echo "  $SCRIPT_DIR/bin/npm-get-host <id>            - Get proxy host"
echo "  $SCRIPT_DIR/bin/npm-create-host <json>       - Create proxy host"
echo "  $SCRIPT_DIR/bin/npm-delete-host <id>         - Delete proxy host"
echo "  $SCRIPT_DIR/bin/npm-enable-host <id>         - Enable proxy host"
echo "  $SCRIPT_DIR/bin/npm-disable-host <id>        - Disable proxy host"
echo "  $SCRIPT_DIR/bin/npm-list-certs               - List certificates"
echo "  $SCRIPT_DIR/bin/npm-renew-cert <id>          - Renew certificate"
echo "  $SCRIPT_DIR/bin/npm-audit                    - Get audit log"
echo ""
echo "To use different NPM instance, set NPM_BASE_URL environment variable"