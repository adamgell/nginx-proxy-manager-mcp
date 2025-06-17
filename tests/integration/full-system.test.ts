import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { NginxProxyManagerClient } from '../../src/index';
import { readFileSync } from 'fs';
import { join } from 'path';

// Test configuration
const TEST_CONFIG = {
  NPM_BASE_URL: process.env.NPM_TEST_URL || 'http://localhost:9181/api',
  ADMIN_EMAIL: 'admin@test.local',
  ADMIN_PASSWORD: 'changeme123',
  TEST_TIMEOUT: 60000,
};

// Load test data
const testData = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/test-data.json'), 'utf-8')
);

describe('Full System Integration Tests', () => {
  let client: NginxProxyManagerClient;
  let createdResources: {
    proxyHosts: number[];
    redirectionHosts: number[];
    deadHosts: number[];
    accessLists: number[];
    certificates: number[];
  } = {
    proxyHosts: [],
    redirectionHosts: [],
    deadHosts: [],
    accessLists: [],
    certificates: [],
  };

  beforeAll(async () => {
    console.log('🚀 Starting full system integration tests');
    console.log(`📡 NPM URL: ${TEST_CONFIG.NPM_BASE_URL}`);
    
    // Initialize client
    client = new NginxProxyManagerClient(TEST_CONFIG.NPM_BASE_URL);
    
    // Authenticate
    await client.authenticate(TEST_CONFIG.ADMIN_EMAIL, TEST_CONFIG.ADMIN_PASSWORD);
    console.log('✅ Authentication successful');
  }, TEST_CONFIG.TEST_TIMEOUT);

  afterAll(async () => {
    console.log('🧹 Cleaning up test resources...');
    
    // Clean up in reverse order to avoid dependencies
    for (const id of createdResources.proxyHosts) {
      try {
        await client.deleteProxyHost(id);
        console.log(`  ✓ Deleted proxy host ${id}`);
      } catch (e) {
        console.error(`  ✗ Failed to delete proxy host ${id}:`, e.message);
      }
    }
    
    for (const id of createdResources.redirectionHosts) {
      try {
        await client.deleteRedirectionHost(id);
        console.log(`  ✓ Deleted redirection host ${id}`);
      } catch (e) {
        console.error(`  ✗ Failed to delete redirection host ${id}:`, e.message);
      }
    }
    
    for (const id of createdResources.deadHosts) {
      try {
        await client.deleteDeadHost(id);
        console.log(`  ✓ Deleted dead host ${id}`);
      } catch (e) {
        console.error(`  ✗ Failed to delete dead host ${id}:`, e.message);
      }
    }
    
    for (const id of createdResources.accessLists) {
      try {
        await client.deleteAccessList(id);
        console.log(`  ✓ Deleted access list ${id}`);
      } catch (e) {
        console.error(`  ✗ Failed to delete access list ${id}:`, e.message);
      }
    }
  });

  describe('1. Proxy Hosts - Complete CRUD Operations', () => {
    test('should list existing proxy hosts', async () => {
      const response = await client.getProxyHosts();
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      console.log(`  Found ${response.data.length} existing proxy hosts`);
    });

    test('should create a basic proxy host', async () => {
      const proxyData = testData.proxyHosts[0];
      const response = await client.createProxyHost(proxyData);
      
      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
      expect(response.data.domain_names).toEqual(proxyData.domain_names);
      
      createdResources.proxyHosts.push(response.data.id);
      console.log(`  ✓ Created proxy host ID ${response.data.id}`);
    });

    test('should get specific proxy host', async () => {
      const id = createdResources.proxyHosts[0];
      const response = await client.getProxyHost(id);
      
      expect(response.status).toBe(200);
      expect(response.data.id).toBe(id);
    });

    test('should update proxy host', async () => {
      const id = createdResources.proxyHosts[0];
      const updateData = {
        forward_port: 8081,
        block_exploits: false,
      };
      
      const response = await client.updateProxyHost(id, updateData);
      expect(response.status).toBe(200);
      expect(response.data.forward_port).toBe(8081);
      expect(response.data.block_exploits).toBe(false);
    });

    test('should disable and enable proxy host', async () => {
      const id = createdResources.proxyHosts[0];
      
      // Disable
      const disableResponse = await client.disableProxyHost(id);
      expect(disableResponse.status).toBe(200);
      
      // Verify disabled
      const getResponse = await client.getProxyHost(id);
      expect(getResponse.data.enabled).toBe(0);
      
      // Enable
      const enableResponse = await client.enableProxyHost(id);
      expect(enableResponse.status).toBe(200);
      
      // Verify enabled
      const getResponse2 = await client.getProxyHost(id);
      expect(getResponse2.data.enabled).toBe(1);
    });

    test('should create proxy host with advanced config', async () => {
      const proxyData = testData.proxyHosts[1];
      const response = await client.createProxyHost(proxyData);
      
      expect(response.status).toBe(201);
      expect(response.data.allow_websocket_upgrade).toBe(true);
      expect(response.data.http2_support).toBe(true);
      
      createdResources.proxyHosts.push(response.data.id);
      console.log(`  ✓ Created advanced proxy host ID ${response.data.id}`);
    });

    test('should delete proxy host', async () => {
      const id = createdResources.proxyHosts.pop();
      const response = await client.deleteProxyHost(id);
      
      expect(response.status).toBe(200);
      console.log(`  ✓ Deleted proxy host ID ${id}`);
      
      // Verify deletion
      await expect(client.getProxyHost(id)).rejects.toMatchObject({
        response: { status: 404 }
      });
    });
  });

  describe('2. Redirection Hosts - Complete CRUD Operations', () => {
    test('should list redirection hosts', async () => {
      const response = await client.getRedirectionHosts();
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('should create redirection host', async () => {
      const redirectData = testData.redirectionHosts[0];
      const response = await client.createRedirectionHost(redirectData);
      
      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
      expect(response.data.forward_http_code).toBe(301);
      
      createdResources.redirectionHosts.push(response.data.id);
      console.log(`  ✓ Created redirection host ID ${response.data.id}`);
    });

    test('should update redirection host', async () => {
      const id = createdResources.redirectionHosts[0];
      const updateData = {
        forward_http_code: 302,
        preserve_path: false,
      };
      
      const response = await client.updateRedirectionHost(id, updateData);
      expect(response.status).toBe(200);
      expect(response.data.forward_http_code).toBe(302);
    });

    test('should enable/disable redirection host', async () => {
      const id = createdResources.redirectionHosts[0];
      
      const disableResponse = await client.disableRedirectionHost(id);
      expect(disableResponse.status).toBe(200);
      
      const enableResponse = await client.enableRedirectionHost(id);
      expect(enableResponse.status).toBe(200);
    });
  });

  describe('3. Dead Hosts (404) - Complete CRUD Operations', () => {
    test('should list dead hosts', async () => {
      const response = await client.getDeadHosts();
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('should create dead host', async () => {
      const deadHostData = testData.deadHosts[0];
      const response = await client.createDeadHost(deadHostData);
      
      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
      
      createdResources.deadHosts.push(response.data.id);
      console.log(`  ✓ Created dead host ID ${response.data.id}`);
    });

    test('should update dead host', async () => {
      const id = createdResources.deadHosts[0];
      const updateData = {
        ssl_forced: true,
        hsts_enabled: true,
      };
      
      const response = await client.updateDeadHost(id, updateData);
      expect(response.status).toBe(200);
      // Note: NPM may return numeric values for booleans
      expect(response.data.ssl_forced).toBeTruthy();
    });
  });

  describe('4. Access Lists - Complete CRUD Operations', () => {
    test('should list access lists', async () => {
      const response = await client.getAccessLists();
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('should create access list', async () => {
      const accessListData = testData.accessLists[0];
      const response = await client.createAccessList(accessListData);
      
      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
      expect(response.data.name).toBe(accessListData.name);
      
      createdResources.accessLists.push(response.data.id);
      console.log(`  ✓ Created access list ID ${response.data.id}`);
    });

    test('should update access list', async () => {
      const id = createdResources.accessLists[0];
      const updateData = {
        name: 'Updated Test Access List',
        satisfy_any: true,
      };
      
      const response = await client.updateAccessList(id, updateData);
      expect(response.status).toBe(200);
      expect(response.data.name).toBe(updateData.name);
    });
  });

  describe('5. Reports and Monitoring', () => {
    test('should get hosts report', async () => {
      const response = await client.getHostsReport();
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('proxy');
      expect(response.data).toHaveProperty('redirection');
      expect(response.data).toHaveProperty('dead');
      
      console.log('  Host counts:', response.data);
    });

    test('should get audit log', async () => {
      const response = await client.getAuditLog();
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      console.log(`  Found ${response.data.length} audit log entries`);
    });
  });

  describe('6. Error Handling', () => {
    test('should handle 404 for non-existent resources', async () => {
      await expect(client.getProxyHost(99999)).rejects.toMatchObject({
        response: { status: 404 }
      });
    });

    test('should handle invalid data', async () => {
      const invalidData = {
        domain_names: [], // Empty domain names
        forward_scheme: 'invalid',
        forward_host: '',
        forward_port: 99999,
      };
      
      await expect(client.createProxyHost(invalidData)).rejects.toThrow();
    });

    test('should handle duplicate domains', async () => {
      const proxyData = {
        domain_names: ['duplicate.local'],
        forward_scheme: 'http',
        forward_host: 'localhost',
        forward_port: 80,
      };
      
      // Create first
      const response1 = await client.createProxyHost(proxyData);
      createdResources.proxyHosts.push(response1.data.id);
      
      // Try to create duplicate
      await expect(client.createProxyHost(proxyData)).rejects.toMatchObject({
        response: { status: 400 }
      });
    });
  });

  describe('7. Performance Tests', () => {
    test('should handle rapid sequential operations', async () => {
      const startTime = Date.now();
      const operations = [];
      
      // List operations
      for (let i = 0; i < 10; i++) {
        operations.push(client.getProxyHosts());
      }
      
      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;
      
      expect(results.every(r => r.status === 200)).toBe(true);
      console.log(`  ✓ Completed 10 list operations in ${duration}ms`);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    test('should handle concurrent CRUD operations', async () => {
      const operations = [];
      
      // Create multiple proxy hosts concurrently
      for (let i = 0; i < 3; i++) {
        const proxyData = {
          domain_names: [`concurrent${i}.local`],
          forward_scheme: 'http',
          forward_host: 'localhost',
          forward_port: 8080 + i,
        };
        operations.push(client.createProxyHost(proxyData));
      }
      
      const results = await Promise.allSettled(operations);
      
      // Track successful creations for cleanup
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          createdResources.proxyHosts.push(result.value.data.id);
          console.log(`  ✓ Created concurrent proxy host ${index}`);
        }
      });
      
      expect(results.filter(r => r.status === 'fulfilled').length).toBeGreaterThan(0);
    });
  });
});

// Export test results function
export function generateTestReport(results: any) {
  const report = {
    timestamp: new Date().toISOString(),
    environment: TEST_CONFIG.NPM_BASE_URL,
    summary: {
      total: results.numTotalTests,
      passed: results.numPassedTests,
      failed: results.numFailedTests,
      successRate: `${((results.numPassedTests / results.numTotalTests) * 100).toFixed(2)}%`,
    },
    details: results.testResults,
  };
  
  return report;
}