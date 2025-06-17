import { NginxProxyManagerClient } from '../../src/index';

/**
 * Stress test to replicate the issues found in production
 * This attempts to reproduce the exact failure patterns from V1->V2->V3
 */

const STRESS_TEST_CONFIG = {
  NPM_BASE_URL: process.env.NPM_TEST_URL || 'http://localhost:9181/api',
  ADMIN_EMAIL: 'admin@test.local',
  ADMIN_PASSWORD: 'changeme123',
};

interface TestResult {
  function: string;
  status: 'success' | 'error';
  details?: any;
  error?: string;
}

export async function runStressTest(): Promise<void> {
  console.log('🔥 Starting Stress Test - Replicating Production Issues');
  console.log('======================================================\n');
  
  const client = new NginxProxyManagerClient(STRESS_TEST_CONFIG.NPM_BASE_URL);
  const results: TestResult[] = [];
  
  // Track created resources for cleanup
  const createdResources = {
    proxyHosts: [] as number[],
    accessLists: [] as number[],
    redirectionHosts: [] as number[],
    deadHosts: [] as number[],
  };

  // Helper function to test and record
  async function testFunction(name: string, fn: () => Promise<any>): Promise<void> {
    try {
      const result = await fn();
      results.push({ function: name, status: 'success', details: result });
      console.log(`✅ ${name}`);
    } catch (error: any) {
      const errorMsg = error.response?.status 
        ? `${error.response.status} - ${error.response.data?.message || 'Unknown error'}`
        : error.message;
      results.push({ function: name, status: 'error', error: errorMsg });
      console.log(`❌ ${name}: ${errorMsg}`);
    }
  }

  try {
    // 1. Authentication
    console.log('1️⃣  Testing Authentication...');
    await testFunction('npm_authenticate', async () => {
      await client.authenticate(STRESS_TEST_CONFIG.ADMIN_EMAIL, STRESS_TEST_CONFIG.ADMIN_PASSWORD);
      return 'Authenticated successfully';
    });

    await testFunction('npm_auth_status', async () => {
      return client.getAuthStatus();
    });

    // 2. Proxy Hosts
    console.log('\n2️⃣  Testing Proxy Hosts...');
    await testFunction('npm_list_proxy_hosts', async () => {
      const response = await client.getProxyHosts();
      return `Found ${response.data.length} proxy hosts`;
    });

    await testFunction('npm_create_proxy_host', async () => {
      const response = await client.createProxyHost({
        domain_names: ['stress-test.local'],
        forward_scheme: 'http',
        forward_host: '192.168.1.100',
        forward_port: 8080,
        certificate_id: 0,
        ssl_forced: false,
        enabled: true,
      });
      createdResources.proxyHosts.push(response.data.id);
      return `Created proxy host ID ${response.data.id}`;
    });

    if (createdResources.proxyHosts.length > 0) {
      const proxyId = createdResources.proxyHosts[0];
      
      await testFunction('npm_get_proxy_host', async () => {
        const response = await client.getProxyHost(proxyId);
        return `Retrieved proxy host ${proxyId}`;
      });

      await testFunction('npm_update_proxy_host', async () => {
        const response = await client.updateProxyHost(proxyId, { forward_port: 8081 });
        return `Updated proxy host ${proxyId}`;
      });

      await testFunction('npm_disable_proxy_host', async () => {
        await client.disableProxyHost(proxyId);
        return `Disabled proxy host ${proxyId}`;
      });

      await testFunction('npm_enable_proxy_host', async () => {
        await client.enableProxyHost(proxyId);
        return `Enabled proxy host ${proxyId}`;
      });

      await testFunction('npm_delete_proxy_host', async () => {
        await client.deleteProxyHost(proxyId);
        createdResources.proxyHosts = createdResources.proxyHosts.filter(id => id !== proxyId);
        return `Deleted proxy host ${proxyId}`;
      });
    }

    // 3. Certificates
    console.log('\n3️⃣  Testing Certificates...');
    await testFunction('npm_list_certificates', async () => {
      const response = await client.getCertificates();
      return `Found ${response.data.length} certificates`;
    });

    await testFunction('npm_create_certificate', async () => {
      const response = await client.createCertificate({
        provider: 'other',
        nice_name: 'Stress Test Cert',
        domain_names: ['stress-cert.local'],
      });
      return `Created certificate ID ${response.data.id}`;
    });

    // 4. Access Lists
    console.log('\n4️⃣  Testing Access Lists...');
    await testFunction('npm_list_access_lists', async () => {
      const response = await client.getAccessLists();
      return `Found ${response.data.length} access lists`;
    });

    await testFunction('npm_list_access_lists_with_expand', async () => {
      const response = await client.getAccessLists('owner,items');
      return `Found ${response.data.length} access lists with expansion`;
    });

    await testFunction('npm_create_access_list', async () => {
      const response = await client.createAccessList({
        name: 'Stress Test Access List',
        satisfy_any: false,
        pass_auth: true,
        items: [{ username: 'stressuser', password: 'stresspass' }],
      });
      createdResources.accessLists.push(response.data.id);
      return `Created access list ID ${response.data.id}`;
    });

    if (createdResources.accessLists.length > 0) {
      const accessId = createdResources.accessLists[0];
      
      await testFunction('npm_update_access_list', async () => {
        const response = await client.updateAccessList(accessId, {
          name: 'Updated Stress Test Access List',
        });
        return `Updated access list ${accessId}`;
      });

      await testFunction('npm_delete_access_list', async () => {
        await client.deleteAccessList(accessId);
        createdResources.accessLists = createdResources.accessLists.filter(id => id !== accessId);
        return `Deleted access list ${accessId}`;
      });
    }

    // 5. Redirection Hosts
    console.log('\n5️⃣  Testing Redirection Hosts...');
    await testFunction('npm_list_redirection_hosts', async () => {
      const response = await client.getRedirectionHosts();
      return `Found ${response.data.length} redirection hosts`;
    });

    await testFunction('npm_create_redirection_host', async () => {
      const response = await client.createRedirectionHost({
        domain_names: ['stress-redirect.local'],
        forward_http_code: 301,
        forward_scheme: 'https',
        forward_domain_name: 'target.local',
        preserve_path: true,
      });
      createdResources.redirectionHosts.push(response.data.id);
      return `Created redirection host ID ${response.data.id}`;
    });

    // 6. Dead Hosts
    console.log('\n6️⃣  Testing Dead Hosts...');
    await testFunction('npm_list_dead_hosts', async () => {
      const response = await client.getDeadHosts();
      return `Found ${response.data.length} dead hosts`;
    });

    await testFunction('npm_create_dead_host', async () => {
      const response = await client.createDeadHost({
        domain_names: ['stress-404.local'],
        ssl_forced: false,
        hsts_enabled: false,
      });
      createdResources.deadHosts.push(response.data.id);
      return `Created dead host ID ${response.data.id}`;
    });

    // 7. Reports
    console.log('\n7️⃣  Testing Reports...');
    await testFunction('npm_get_hosts_report', async () => {
      const response = await client.getHostsReport();
      return response.data;
    });

    await testFunction('npm_get_audit_log', async () => {
      const response = await client.getAuditLog();
      return `Found ${response.data.length} audit log entries`;
    });

  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up test resources...');
    
    // Clean up any remaining resources
    for (const id of createdResources.proxyHosts) {
      try {
        await client.deleteProxyHost(id);
        console.log(`  Cleaned up proxy host ${id}`);
      } catch (e) {}
    }
    
    for (const id of createdResources.accessLists) {
      try {
        await client.deleteAccessList(id);
        console.log(`  Cleaned up access list ${id}`);
      } catch (e) {}
    }
    
    for (const id of createdResources.redirectionHosts) {
      try {
        await client.deleteRedirectionHost(id);
        console.log(`  Cleaned up redirection host ${id}`);
      } catch (e) {}
    }
    
    for (const id of createdResources.deadHosts) {
      try {
        await client.deleteDeadHost(id);
        console.log(`  Cleaned up dead host ${id}`);
      } catch (e) {}
    }
  }

  // Generate summary
  console.log('\n📊 Stress Test Summary');
  console.log('======================');
  
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const successRate = (successCount / results.length) * 100;
  
  console.log(`Total Functions Tested: ${results.length}`);
  console.log(`Successful: ${successCount} ✅`);
  console.log(`Failed: ${errorCount} ❌`);
  console.log(`Success Rate: ${successRate.toFixed(2)}%`);
  
  if (errorCount > 0) {
    console.log('\n❌ Failed Functions:');
    results
      .filter(r => r.status === 'error')
      .forEach(r => console.log(`  - ${r.function}: ${r.error}`));
  }
  
  // Compare with production results
  console.log('\n🔍 Comparison with Production Issues:');
  if (successRate < 20) {
    console.log('  ⚠️  Critical failure detected - matches V3 production issues');
  } else if (successRate < 70) {
    console.log('  ⚠️  Significant degradation - matches V2 production issues');
  } else if (successRate > 90) {
    console.log('  ✅ High success rate - better than production environment');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runStressTest().catch(console.error);
}