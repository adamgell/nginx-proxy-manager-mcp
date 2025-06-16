import axios from 'axios';

const NPM_BASE_URL = 'http://192.168.2.4:81/api';
const credentials = {
  identity: 'me@adamgell.com',
  secret: 'wfy6gfa8EVB_gzy0gwh'
};

async function authenticateAndCreateProxy() {
  try {
    // Step 1: Authenticate
    console.log('Authenticating with NPM...');
    const authResponse = await axios.post(`${NPM_BASE_URL}/tokens`, credentials);
    const token = authResponse.data.token;
    console.log('Authentication successful!');
    console.log('Token:', token);

    // Configure axios with auth token
    const api = axios.create({
      baseURL: NPM_BASE_URL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Step 2: Create proxy host
    console.log('\nCreating proxy host...');
    const proxyHostData = {
      domain_names: ['test.gell.one'],
      forward_scheme: 'http',
      forward_host: '127.0.0.1',
      forward_port: 81,
      block_exploits: true,
      ssl_forced: false,
      caching_enabled: false,
      allow_websocket_upgrade: true,
      access_list_id: 0,
      advanced_config: '',
      enabled: 1,
      meta: {},
      hsts_enabled: false,
      hsts_subdomains: false,
      http2_support: false,
      locations: []
    };

    const proxyResponse = await api.post('/nginx/proxy-hosts', proxyHostData);
    console.log('Proxy host created successfully!');
    console.log('\nProxy Host Response:');
    console.log(JSON.stringify(proxyResponse.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

// Run the script
authenticateAndCreateProxy();