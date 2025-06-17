#!/bin/bash

# Test Script for docker02 Environment
# This script is designed to work reliably on docker02 server

set -e

echo "🚀 Nginx Proxy Manager MCP Test Suite for docker02"
echo "=================================================="
echo ""

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if we're on docker02 or similar environment
if [ -f /.dockerenv ] || grep -q docker /proc/1/cgroup 2>/dev/null; then
    echo "📦 Running in containerized environment"
    IN_CONTAINER=true
else
    echo "💻 Running on host system"
    IN_CONTAINER=false
fi

# Function to run npm commands with proper error handling
run_npm() {
    local cmd=$1
    echo "🔧 Running: npm $cmd"
    if ! npm $cmd; then
        echo "❌ npm $cmd failed"
        return 1
    fi
    return 0
}

# Function to check dependencies
check_dependencies() {
    echo "1️⃣  Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed"
        return 1
    fi
    echo "✅ Node.js: $(node --version)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is not installed"
        return 1
    fi
    echo "✅ npm: $(npm --version)"
    
    # Check Docker (if not in container)
    if [ "$IN_CONTAINER" = false ]; then
        if ! command -v docker &> /dev/null; then
            echo "❌ Docker is not installed"
            return 1
        fi
        echo "✅ Docker: $(docker --version)"
        
        if ! docker info &> /dev/null; then
            echo "❌ Docker daemon is not running"
            return 1
        fi
    fi
    
    return 0
}

# Function to setup environment
setup_environment() {
    echo -e "\n2️⃣  Setting up test environment..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        run_npm install || return 1
    fi
    
    # Build the project
    echo "🔨 Building project..."
    run_npm "run build" || return 1
    
    return 0
}

# Function to run unit tests
run_unit_tests() {
    echo -e "\n3️⃣  Running unit tests..."
    
    if run_npm "test -- tests/unit.test.ts"; then
        echo "✅ Unit tests passed"
        return 0
    else
        echo "❌ Unit tests failed"
        return 1
    fi
}

# Function to run integration tests
run_integration_tests() {
    echo -e "\n4️⃣  Running integration tests..."
    
    # Skip if in container (can't run Docker in Docker easily)
    if [ "$IN_CONTAINER" = true ]; then
        echo "⚠️  Skipping integration tests in containerized environment"
        return 0
    fi
    
    # Start test environment
    echo "🐳 Starting test containers..."
    if [ -f "./start-test-env.sh" ]; then
        ./start-test-env.sh || return 1
    else
        docker-compose -f docker-compose.full-test.yml up -d || return 1
        sleep 30  # Wait for services
    fi
    
    # Run stress test
    echo "🔥 Running stress test..."
    export NPM_TEST_URL="http://localhost:9181/api"
    if npx tsx tests/integration/stress-test.ts; then
        echo "✅ Integration tests passed"
        docker-compose -f docker-compose.full-test.yml down -v
        return 0
    else
        echo "❌ Integration tests failed"
        docker-compose -f docker-compose.full-test.yml down -v
        return 1
    fi
}

# Function to test direct tools
test_direct_tools() {
    echo -e "\n5️⃣  Testing direct tools..."
    
    # Test npm-direct command
    echo "Testing npm-direct-tools..."
    if node dist/npm-direct-tools.js --help &> /dev/null; then
        echo "✅ npm-direct-tools is working"
    else
        echo "❌ npm-direct-tools failed"
        return 1
    fi
    
    return 0
}

# Main execution
main() {
    local exit_code=0
    
    # Check dependencies
    if ! check_dependencies; then
        echo "❌ Dependency check failed"
        exit 1
    fi
    
    # Setup environment
    if ! setup_environment; then
        echo "❌ Environment setup failed"
        exit 1
    fi
    
    # Run unit tests
    if ! run_unit_tests; then
        exit_code=1
    fi
    
    # Run integration tests
    if ! run_integration_tests; then
        exit_code=1
    fi
    
    # Test direct tools
    if ! test_direct_tools; then
        exit_code=1
    fi
    
    # Summary
    echo -e "\n======================================"
    if [ $exit_code -eq 0 ]; then
        echo "✅ All tests passed successfully!"
        echo "The npm-proxy-manager-mcp is ready for use on docker02"
    else
        echo "❌ Some tests failed"
        echo "Please check the output above for details"
    fi
    echo "======================================"
    
    exit $exit_code
}

# Run main function
main "$@"