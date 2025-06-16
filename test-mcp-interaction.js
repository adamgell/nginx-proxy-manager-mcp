#!/usr/bin/env node

// Simple test script to interact with the MCP server
import { spawn } from 'child_process';

// Start the MCP server process
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: { ...process.env, NPM_BASE_URL: 'http://localhost:81/api' }
});

// Function to send MCP request and get response
function sendMCPRequest(request) {
  return new Promise((resolve) => {
    const requestStr = JSON.stringify(request) + '\n';
    
    let responseData = '';
    
    const responseHandler = (data) => {
      responseData += data.toString();
      
      // Check if we have a complete JSON response
      try {
        const lines = responseData.trim().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            const response = JSON.parse(line);
            server.stdout.off('data', responseHandler);
            resolve(response);
            return;
          }
        }
      } catch (e) {
        // Continue collecting data if JSON is incomplete
      }
    };
    
    server.stdout.on('data', responseHandler);
    server.stdin.write(requestStr);
  });
}

async function testMCPServer() {
  console.log('🚀 Testing Nginx Proxy Manager MCP Server...\n');
  
  try {
    // Test 1: Initialize connection
    console.log('1. Testing connection initialization...');
    const initResponse = await sendMCPRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    });
    console.log('✅ Initialize response:', JSON.stringify(initResponse, null, 2));
    
    // Test 2: List available tools
    console.log('\n2. Listing available tools...');
    const toolsResponse = await sendMCPRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    });
    console.log('✅ Available tools:');
    toolsResponse.result.tools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    
    // Test 3: Test a simple tool call (authenticate)
    console.log('\n3. Testing authenticate tool...');
    const authResponse = await sendMCPRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'authenticate',
        arguments: {
          identity: 'test@example.com',
          secret: 'wrongpassword'
        }
      }
    });
    console.log('📋 Auth test response:', JSON.stringify(authResponse, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing MCP server:', error);
  } finally {
    server.kill();
    console.log('\n🔚 Test completed');
  }
}

// Run the test
testMCPServer();