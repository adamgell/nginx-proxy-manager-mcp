#!/bin/bash

# Start Test Environment Script
# This script ensures a clean start of the test environment
# Compatible with both macOS and Linux

set -e

echo "🚀 Starting Nginx Proxy Manager Test Environment"
echo "=============================================="

# Configuration
COMPOSE_FILE="docker-compose.full-test.yml"
TEST_URL="http://localhost:9181/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to cleanup
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
    
    # Stop test environment
    docker-compose -f "$COMPOSE_FILE" down -v 2>/dev/null || true
    
    # Stop any containers using our ports
    for port in 9181 8181; do
        containers=$(docker ps -q --filter "publish=$port" 2>/dev/null || true)
        if [ ! -z "$containers" ]; then
            echo "   Stopping containers using port $port..."
            docker stop $containers 2>/dev/null || true
        fi
    done
    
    # Remove orphan containers
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${RED}❌ Port $port is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $port is available${NC}"
        return 0
    fi
}

# Main execution
echo "1️⃣  Checking system requirements..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Clean up any existing environment
echo -e "\n2️⃣  Cleaning up existing environment..."
cleanup

# Check ports
echo -e "\n3️⃣  Checking port availability..."
ports_available=true
for port in 9181 3306; do
    if ! check_port $port; then
        ports_available=false
    fi
done

if [ "$ports_available" = false ]; then
    echo -e "${RED}Please free up the required ports and try again.${NC}"
    exit 1
fi

# Start the test environment
echo -e "\n4️⃣  Starting test environment..."
docker-compose -f "$COMPOSE_FILE" up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start Docker containers${NC}"
    exit 1
fi

# Wait for services to be ready
echo -e "\n5️⃣  Waiting for services to be ready..."
max_attempts=60
attempt=1

while [ $attempt -le $max_attempts ]; do
    # Check database
    db_ready=$(docker exec npm-test-db mariadb-admin ping -h localhost -u root -pnpm_test_root_password 2>&1 | grep -c "is alive" || echo "0")
    
    # Check NPM API (expecting 302 redirect)
    npm_status=$(curl -s -o /dev/null -w "%{http_code}" $TEST_URL 2>/dev/null || echo "000")
    
    if [ "$db_ready" = "1" ] && ([ "$npm_status" = "302" ] || [ "$npm_status" = "200" ]); then
        echo -e "${GREEN}✅ All services are ready!${NC}"
        break
    fi
    
    echo "  Waiting... ($attempt/$max_attempts) [DB: $([ "$db_ready" = "1" ] && echo "✓" || echo "✗"), NPM: $npm_status]"
    sleep 5
    ((attempt++))
done

if [ $attempt -gt $max_attempts ]; then
    echo -e "${RED}❌ Services failed to start within timeout${NC}"
    echo "Checking logs..."
    docker logs npm-test-db --tail 20
    docker logs npm-test-app --tail 20
    exit 1
fi

# Display connection information
echo -e "\n${GREEN}✅ Test environment is ready!${NC}"
echo "=================================="
echo "NPM URL: $TEST_URL"
echo "Admin Email: admin@test.local"
echo "Admin Password: changeme123"
echo "=================================="
echo ""
echo "To run tests:"
echo "  npm test"
echo ""
echo "To run stress test:"
echo "  NPM_TEST_URL=$TEST_URL npx tsx tests/integration/stress-test.ts"
echo ""
echo "To stop the environment:"
echo "  docker-compose -f $COMPOSE_FILE down"
echo ""