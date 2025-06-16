#!/usr/bin/env node

// Direct API approach to create proxy host
import axios from 'axios';

const NPM_BASE_URL = 'http://192.168.2.4:81/api';

async function createProxyHost() {
  console.log('Creating proxy host via direct API...');
  
  try {
    // Step 1: Authenticate
    console.log('1. Authenticating...');
    const authResponse = await axios.post(`${NPM_BASE_URL}/tokens`, {
      identity: 'admin@example.com',
      secret: 'changeme',
      scope: 'user'
    });
    
    const token = authResponse.data.token;
    console.log('   ✓ Authentication successful! Token expires:', authResponse.data.expires);
    
    // Create axios instance with auth header
    const api = axios.create({
      baseURL: NPM_BASE_URL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Step 2: Create proxy host
    console.log('\n2. Creating proxy host for test.gell.one...');
    const proxyData = {
      domain_names: ['test.gell.one'],
      forward_scheme: 'http',
      forward_host: '127.0.0.1',
      forward_port: 81,
      certificate_id: 0,
      ssl_forced: false,
      hsts_enabled: false,
      hsts_subdomains: false,
      http2_support: false,
      block_exploits: true,
      caching_enabled: false,
      allow_websocket_upgrade: false,
      access_list_id: 0,
      advanced_config: '',
      enabled: true,
      meta: {
        letsencrypt_agree: false,
        dns_challenge: false,
        letsencrypt_email: ''
      },
      locations: []
    };
    
    const createResponse = await api.post('/nginx/proxy-hosts', proxyData);
    console.log('   ✓ Proxy host created successfully!');
    console.log('\nProxy Host Details:');
    console.log('   ID:', createResponse.data.id);
    console.log('   Domain:', createResponse.data.domain_names[0]);
    console.log('   Forward to:', `${createResponse.data.forward_scheme}://${createResponse.data.forward_host}:${createResponse.data.forward_port}`);
    console.log('   Block Exploits:', createResponse.data.block_exploits);
    console.log('   Enabled:', createResponse.data.enabled);
    
    // Step 3: List all proxy hosts to verify
    console.log('\n3. Listing all proxy hosts...');
    const listResponse = await api.get('/nginx/proxy-hosts');
    console.log(`   ✓ Total proxy hosts: ${listResponse.data.length}`);
    
    const ourHost = listResponse.data.find(h => h.domain_names.includes('test.gell.one'));
    if (ourHost) {
      console.log('   ✓ Verified: test.gell.one is in the list');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.response ? error.response.data : error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

createProxyHost().catch(console.error);