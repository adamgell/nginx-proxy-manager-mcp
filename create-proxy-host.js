#!/usr/bin/env node

// Script to create a proxy host using MCP tools
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function createProxyHost() {
  console.log('Starting MCP client to create proxy host...');
  
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['/Users/adam.gell/Documents/GitHub/nginx-proxy-manager-mcp/dist/index.js'],
    env: { ...process.env, NPM_BASE_URL: 'http://192.168.2.4:81/api' }
  });

  const client = new Client({
    name: 'proxy-host-creator',
    version: '1.0.0',
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log('Connected to MCP server');

    // List available tools
    const tools = await client.listTools();
    console.log('Available tools:', tools.tools.map(t => t.name));

    // First authenticate
    console.log('\nAuthenticating...');
    const authResult = await client.callTool('npm_authenticate', {
      identity: 'admin@example.com',
      secret: 'changeme'
    });
    console.log('Auth result:', authResult);

    // Create proxy host
    console.log('\nCreating proxy host...');
    const proxyResult = await client.callTool('npm_create_proxy_host', {
      domain_names: ['test.gell.one'],
      forward_scheme: 'http',
      forward_host: '127.0.0.1',
      forward_port: 81,
      block_exploits: true,
      caching_enabled: false,
      allow_websocket_upgrade: false,
      http2_support: false,
      ssl_forced: false,
      hsts_enabled: false,
      hsts_subdomains: false,
      enabled: true
    });
    
    console.log('Proxy host created:', JSON.parse(proxyResult.content[0].text));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

createProxyHost().catch(console.error);