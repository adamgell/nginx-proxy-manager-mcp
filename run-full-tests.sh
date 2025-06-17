#!/bin/bash

# Full Testing Suite Runner for nginx-proxy-manager-mcp
# This script runs comprehensive tests against a clean NPM instance

set -e

echo "🚀 Starting Nginx Proxy Manager MCP Full Test Suite"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TEST_ENV=${TEST_ENV:-"full-test"}
COMPOSE_FILE="docker-compose.${TEST_ENV}.yml"
TEST_REPORTS_DIR="test-reports"
TEST_LOGS_DIR="test-logs"

# Create directories
mkdir -p "$TEST_REPORTS_DIR"
mkdir -p "$TEST_LOGS_DIR"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up test environment...${NC}"
    docker-compose -f "$COMPOSE_FILE" down -v 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Function to wait for services
wait_for_services() {
    echo "⏳ Waiting for services to be healthy..."
    
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        # Check if NPM API is responding
        if curl -s -f http://localhost:9181/api > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Services are ready!${NC}"
            return 0
        fi
        
        echo "  Waiting... ($attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    echo -e "${RED}❌ Services failed to start within timeout${NC}"
    return 1
}

# Function to run tests
run_tests() {
    local test_type=$1
    local test_file=$2
    
    echo -e "\n${YELLOW}🧪 Running $test_type tests...${NC}"
    
    # Set environment variables for tests
    export NPM_TEST_URL="http://localhost:9181/api"
    export NODE_ENV="test"
    
    # Run tests and capture output
    if npm test -- "$test_file" --json --outputFile="$TEST_REPORTS_DIR/${test_type}-results.json" 2>&1 | tee "$TEST_LOGS_DIR/${test_type}-output.log"; then
        echo -e "${GREEN}✅ $test_type tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_type tests failed${NC}"
        return 1
    fi
}

# Function to collect logs
collect_logs() {
    echo -e "\n${YELLOW}📋 Collecting container logs...${NC}"
    
    docker logs npm-test-db > "$TEST_LOGS_DIR/db-logs.txt" 2>&1 || true
    docker logs npm-test-app > "$TEST_LOGS_DIR/npm-logs.txt" 2>&1 || true
    
    echo "  Logs saved to $TEST_LOGS_DIR/"
}

# Function to generate summary report
generate_summary() {
    echo -e "\n${YELLOW}📊 Generating test summary...${NC}"
    
    local timestamp=$(date +"%Y%m%d-%H%M%S")
    local summary_file="$TEST_REPORTS_DIR/summary-$timestamp.md"
    
    cat > "$summary_file" << EOF
# Test Summary Report
Generated: $(date)

## Environment
- NPM Version: 2.11.3
- Test URL: http://localhost:9181/api
- Docker Environment: $TEST_ENV

## Test Results
EOF
    
    # Parse test results
    for result_file in "$TEST_REPORTS_DIR"/*-results.json; do
        if [ -f "$result_file" ]; then
            local test_name=$(basename "$result_file" -results.json)
            local total=$(jq '.numTotalTests' "$result_file" 2>/dev/null || echo "0")
            local passed=$(jq '.numPassedTests' "$result_file" 2>/dev/null || echo "0")
            local failed=$(jq '.numFailedTests' "$result_file" 2>/dev/null || echo "0")
            local success_rate=0
            
            if [ "$total" -gt 0 ]; then
                success_rate=$(( passed * 100 / total ))
            fi
            
            echo "### $test_name" >> "$summary_file"
            echo "- Total Tests: $total" >> "$summary_file"
            echo "- Passed: $passed ✅" >> "$summary_file"
            echo "- Failed: $failed ❌" >> "$summary_file"
            echo "- Success Rate: $success_rate%" >> "$summary_file"
            echo "" >> "$summary_file"
        fi
    done
    
    echo -e "${GREEN}✅ Summary saved to $summary_file${NC}"
}

# Main execution
main() {
    echo "1️⃣  Stopping any existing test containers..."
    docker-compose -f "$COMPOSE_FILE" down -v 2>/dev/null || true
    
    echo -e "\n2️⃣  Starting fresh test environment..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    echo -e "\n3️⃣  Waiting for services to be ready..."
    if ! wait_for_services; then
        echo -e "${RED}Failed to start services. Check logs for details.${NC}"
        collect_logs
        exit 1
    fi
    
    echo -e "\n4️⃣  Running test suites..."
    
    # Track overall success
    all_passed=true
    
    # Run different test suites
    if ! run_tests "integration" "tests/integration/full-system.test.ts"; then
        all_passed=false
    fi
    
    if ! run_tests "unit" "tests/unit.test.ts"; then
        all_passed=false
    fi
    
    echo -e "\n5️⃣  Collecting logs and generating reports..."
    collect_logs
    generate_summary
    
    # Final status
    echo -e "\n=================================================="
    if [ "$all_passed" = true ]; then
        echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
        echo "View detailed reports in: $TEST_REPORTS_DIR/"
        exit 0
    else
        echo -e "${RED}❌ SOME TESTS FAILED${NC}"
        echo "Check logs in: $TEST_LOGS_DIR/"
        echo "View reports in: $TEST_REPORTS_DIR/"
        exit 1
    fi
}

# Run main function
main "$@"