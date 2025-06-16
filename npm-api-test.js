import axios from 'axios';

const NPM_BASE_URL = 'http://192.168.2.4:81/api';
const credentials = {
  identity: 'me@adamgell.com',
  secret: 'wfy6gfa8EVB_gzy0gwh'
};

async function testNPMConnection() {
  try {
    // Step 1: Authenticate
    console.log('1. Authenticating with Nginx Proxy Manager...');
    console.log(`   URL: ${NPM_BASE_URL}`);
    console.log(`   Email: ${credentials.identity}`);
    
    const authResponse = await axios.post(`${NPM_BASE_URL}/tokens`, credentials);
    const token = authResponse.data.token;
    console.log('✅ Authentication successful!');
    console.log(`   Token: ${token.substring(0, 20)}...`);

    // Configure axios with auth token
    const api = axios.create({
      baseURL: NPM_BASE_URL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Step 2: List proxy hosts
    console.log('\n2. Listing all proxy hosts...');
    const proxyHostsResponse = await api.get('/nginx/proxy-hosts?expand=certificate,access_list');
    const proxyHosts = proxyHostsResponse.data;
    
    console.log(`✅ Found ${proxyHosts.length} proxy host(s):`);
    proxyHosts.forEach((host, index) => {
      console.log(`\n   Proxy Host #${index + 1}:`);
      console.log(`   - ID: ${host.id}`);
      console.log(`   - Domains: ${host.domain_names.join(', ')}`);
      console.log(`   - Forward to: ${host.forward_scheme}://${host.forward_host}:${host.forward_port}`);
      console.log(`   - SSL: ${host.certificate_id ? `Certificate ID ${host.certificate_id}` : 'None'}`);
      console.log(`   - Enabled: ${host.enabled ? 'Yes' : 'No'}`);
      if (host.certificate) {
        console.log(`   - Certificate Name: ${host.certificate.nice_name || 'N/A'}`);
      }
    });

    // Step 3: List SSL certificates
    console.log('\n3. Listing all SSL certificates...');
    const certificatesResponse = await api.get('/nginx/certificates?expand=owner');
    const certificates = certificatesResponse.data;
    
    console.log(`✅ Found ${certificates.length} certificate(s):`);
    certificates.forEach((cert, index) => {
      console.log(`\n   Certificate #${index + 1}:`);
      console.log(`   - ID: ${cert.id}`);
      console.log(`   - Name: ${cert.nice_name || 'N/A'}`);
      console.log(`   - Domains: ${cert.domain_names.join(', ')}`);
      console.log(`   - Provider: ${cert.provider}`);
      console.log(`   - Expires: ${new Date(cert.expires_on * 1000).toLocaleDateString()}`);
      console.log(`   - Created: ${cert.created_on}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused. Please check:');
      console.error('   - Is Nginx Proxy Manager running?');
      console.error('   - Is it accessible at http://localhost:81?');
      console.error('   - Is the API path correct (/api)?');
    } else if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', error.response.data);
    }
  }
}

// Run the test
testNPMConnection();