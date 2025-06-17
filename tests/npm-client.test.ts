import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import { TEST_CONFIG, waitForNPM } from './setup';

// Import the client class - we'll need to adjust the import path
class NginxProxyManagerClient {
  private client: any;
  private token?: string;

  constructor(private baseUrl: string) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async authenticate(identity: string, secret: string): Promise<void> {
    try {
      const response = await this.client.post('/tokens', {
        identity,
        secret,
        scope: 'user',
      });
      this.token = response.data.token;
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    } catch (error: any) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  // Proxy Hosts
  async getProxyHosts(expand?: string) {
    const params = expand ? { expand } : {};
    return this.client.get('/nginx/proxy-hosts', { params });
  }

  async getProxyHost(id: number) {
    return this.client.get(`/nginx/proxy-hosts/${id}`);
  }

  async createProxyHost(data: any) {
    return this.client.post('/nginx/proxy-hosts', data);
  }

  async updateProxyHost(id: number, data: any) {
    return this.client.put(`/nginx/proxy-hosts/${id}`, data);
  }

  async deleteProxyHost(id: number) {
    return this.client.delete(`/nginx/proxy-hosts/${id}`);
  }

  async enableProxyHost(id: number) {
    return this.client.post(`/nginx/proxy-hosts/${id}/enable`);
  }

  async disableProxyHost(id: number) {
    return this.client.post(`/nginx/proxy-hosts/${id}/disable`);
  }

  // Certificates
  async getCertificates(expand?: string) {
    const params = expand ? { expand } : {};
    return this.client.get('/nginx/certificates', { params });
  }

  async createCertificate(data: any) {
    return this.client.post('/nginx/certificates', data);
  }

  async deleteCertificate(id: number) {
    return this.client.delete(`/nginx/certificates/${id}`);
  }

  async renewCertificate(id: number) {
    return this.client.post(`/nginx/certificates/${id}/renew`);
  }

  // Access Lists
  async getAccessLists(expand?: string) {
    const params = expand ? { expand } : {};
    return this.client.get('/nginx/access-lists', { params });
  }

  async createAccessList(data: any) {
    return this.client.post('/nginx/access-lists', data);
  }

  async updateAccessList(id: number, data: any) {
    return this.client.put(`/nginx/access-lists/${id}`, data);
  }

  async deleteAccessList(id: number) {
    return this.client.delete(`/nginx/access-lists/${id}`);
  }

  // Reports
  async getHostsReport() {
    return this.client.get('/reports/hosts');
  }

  // Redirection Hosts
  async getRedirectionHosts(expand?: string) {
    const params = expand ? { expand } : {};
    return this.client.get('/nginx/redirection-hosts', { params });
  }

  async getRedirectionHost(id: number) {
    return this.client.get(`/nginx/redirection-hosts/${id}`);
  }

  async createRedirectionHost(data: any) {
    return this.client.post('/nginx/redirection-hosts', data);
  }

  async updateRedirectionHost(id: number, data: any) {
    return this.client.put(`/nginx/redirection-hosts/${id}`, data);
  }

  async deleteRedirectionHost(id: number) {
    return this.client.delete(`/nginx/redirection-hosts/${id}`);
  }

  async enableRedirectionHost(id: number) {
    return this.client.post(`/nginx/redirection-hosts/${id}/enable`);
  }

  async disableRedirectionHost(id: number) {
    return this.client.post(`/nginx/redirection-hosts/${id}/disable`);
  }

  // Dead Hosts (404 Hosts)
  async getDeadHosts(expand?: string) {
    const params = expand ? { expand } : {};
    return this.client.get('/nginx/dead-hosts', { params });
  }

  async getDeadHost(id: number) {
    return this.client.get(`/nginx/dead-hosts/${id}`);
  }

  async createDeadHost(data: any) {
    return this.client.post('/nginx/dead-hosts', data);
  }

  async updateDeadHost(id: number, data: any) {
    return this.client.put(`/nginx/dead-hosts/${id}`, data);
  }

  async deleteDeadHost(id: number) {
    return this.client.delete(`/nginx/dead-hosts/${id}`);
  }

  async enableDeadHost(id: number) {
    return this.client.post(`/nginx/dead-hosts/${id}/enable`);
  }

  async disableDeadHost(id: number) {
    return this.client.post(`/nginx/dead-hosts/${id}/disable`);
  }

  // Audit Log
  async getAuditLog() {
    return this.client.get('/audit-log');
  }
}

describe('Nginx Proxy Manager Client', () => {
  let client: NginxProxyManagerClient;
  let createdProxyHostId: number;
  let createdAccessListId: number;
  let createdRedirectionHostId: number;
  let createdDeadHostId: number;

  beforeAll(async () => {
    // Wait for NPM to be available
    await waitForNPM();
    
    client = new NginxProxyManagerClient(TEST_CONFIG.NPM_BASE_URL);
    
    // Authenticate with test credentials
    await client.authenticate(TEST_CONFIG.TEST_EMAIL, TEST_CONFIG.TEST_PASSWORD);
  }, 120000);

  describe('Authentication', () => {
    test('should authenticate successfully', async () => {
      const testClient = new NginxProxyManagerClient(TEST_CONFIG.NPM_BASE_URL);
      await expect(
        testClient.authenticate(TEST_CONFIG.TEST_EMAIL, TEST_CONFIG.TEST_PASSWORD)
      ).resolves.not.toThrow();
    });

    test('should fail with invalid credentials', async () => {
      const testClient = new NginxProxyManagerClient(TEST_CONFIG.NPM_BASE_URL);
      await expect(
        testClient.authenticate('invalid@example.com', 'wrongpassword')
      ).rejects.toThrow('Authentication failed');
    });
  });

  describe('Proxy Hosts', () => {
    test('should list proxy hosts', async () => {
      const response = await client.getProxyHosts();
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('should list proxy hosts with expand parameter', async () => {
      const response = await client.getProxyHosts('owner,certificate');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('should create a proxy host', async () => {
      const proxyHostData = {
        domain_names: ['test.example.com'],
        forward_scheme: 'http',
        forward_host: '192.168.1.100',
        forward_port: 8080,
        ssl_forced: false,
        block_exploits: true,
        enabled: true
      };

      const response = await client.createProxyHost(proxyHostData);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.domain_names).toEqual(['test.example.com']);
      
      createdProxyHostId = response.data.id;
    });

    test('should get a specific proxy host', async () => {
      const response = await client.getProxyHost(createdProxyHostId);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', createdProxyHostId);
      expect(response.data.domain_names).toEqual(['test.example.com']);
    });

    test('should update a proxy host', async () => {
      const updateData = {
        domain_names: ['updated-test.example.com'],
        forward_port: 9090
      };

      const response = await client.updateProxyHost(createdProxyHostId, updateData);
      expect(response.status).toBe(200);
      expect(response.data.domain_names).toEqual(['updated-test.example.com']);
      expect(response.data.forward_port).toBe(9090);
    });

    test('should disable a proxy host', async () => {
      const response = await client.disableProxyHost(createdProxyHostId);
      expect(response.status).toBe(200);
    });

    test('should enable a proxy host', async () => {
      const response = await client.enableProxyHost(createdProxyHostId);
      expect(response.status).toBe(200);
    });

    test('should delete a proxy host', async () => {
      const response = await client.deleteProxyHost(createdProxyHostId);
      expect(response.status).toBe(200);
    });

    test('should return 404 for non-existent proxy host', async () => {
      await expect(client.getProxyHost(999999)).rejects.toMatchObject({
        response: { status: 404 }
      });
    });
  });

  describe('Certificates', () => {
    test('should list certificates', async () => {
      const response = await client.getCertificates();
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('should list certificates with expand parameter', async () => {
      const response = await client.getCertificates('owner');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    // Note: Creating actual certificates in tests might be problematic
    // as it requires domain validation. We'll test the endpoint but expect failures.
    test('should attempt to create a custom certificate', async () => {
      const certData = {
        provider: 'other',
        nice_name: 'Test Certificate',
        domain_names: ['test.example.com'],
        certificate: '-----BEGIN CERTIFICATE-----\nfake cert data\n-----END CERTIFICATE-----',
        certificate_key: '-----BEGIN PRIVATE KEY-----\nfake key data\n-----END PRIVATE KEY-----'
      };

      // This might fail due to invalid cert data, which is expected in tests
      try {
        const response = await client.createCertificate(certData);
        expect(response.status).toBe(201);
      } catch (error: any) {
        // Expected to fail with invalid certificate data
        expect(error.response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('Access Lists', () => {
    test('should list access lists', async () => {
      const response = await client.getAccessLists();
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('should create an access list', async () => {
      const accessListData = {
        name: 'Test Access List',
        satisfy_any: false,
        pass_auth: true,
        items: [
          {
            username: 'testuser',
            password: 'testpass123'
          }
        ],
        clients: [
          {
            address: '192.168.1.0/24',
            directive: 'allow'
          }
        ]
      };

      const response = await client.createAccessList(accessListData);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.name).toBe('Test Access List');
      
      createdAccessListId = response.data.id;
    });

    test('should update an access list', async () => {
      const updateData = {
        name: 'Updated Test Access List',
        satisfy_any: true
      };

      const response = await client.updateAccessList(createdAccessListId, updateData);
      expect(response.status).toBe(200);
      expect(response.data.name).toBe('Updated Test Access List');
      expect(response.data.satisfy_any).toBe(true);
    });

    test('should delete an access list', async () => {
      const response = await client.deleteAccessList(createdAccessListId);
      expect(response.status).toBe(200);
    });
  });

  describe('Reports', () => {
    test('should get hosts report', async () => {
      const response = await client.getHostsReport();
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('proxy');
      expect(response.data).toHaveProperty('redirection');
      expect(response.data).toHaveProperty('stream');
      expect(response.data).toHaveProperty('dead');
      expect(typeof response.data.proxy).toBe('number');
      expect(typeof response.data.redirection).toBe('number');
      expect(typeof response.data.stream).toBe('number');
      expect(typeof response.data.dead).toBe('number');
    });
  });

  describe('Redirection Hosts', () => {
    test('should list redirection hosts', async () => {
      const response = await client.getRedirectionHosts();
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('should list redirection hosts with expand parameter', async () => {
      const response = await client.getRedirectionHosts('owner,certificate');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('should create a redirection host', async () => {
      const redirectionHostData = {
        domain_names: ['redirect.example.com'],
        forward_http_code: 301,
        forward_scheme: 'https',
        forward_domain_name: 'target.example.com',
        preserve_path: true,
        ssl_forced: false,
        block_exploits: true,
        enabled: true
      };

      const response = await client.createRedirectionHost(redirectionHostData);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.domain_names).toEqual(['redirect.example.com']);
      expect(response.data.forward_http_code).toBe(301);
      expect(response.data.forward_domain_name).toBe('target.example.com');
      
      createdRedirectionHostId = response.data.id;
    });

    test('should get a specific redirection host', async () => {
      const response = await client.getRedirectionHost(createdRedirectionHostId);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', createdRedirectionHostId);
      expect(response.data.domain_names).toEqual(['redirect.example.com']);
    });

    test('should update a redirection host', async () => {
      const updateData = {
        forward_http_code: 302,
        preserve_path: false
      };

      const response = await client.updateRedirectionHost(createdRedirectionHostId, updateData);
      expect(response.status).toBe(200);
      expect(response.data.forward_http_code).toBe(302);
      expect(response.data.preserve_path).toBe(false);
    });

    test('should disable a redirection host', async () => {
      const response = await client.disableRedirectionHost(createdRedirectionHostId);
      expect(response.status).toBe(200);
    });

    test('should enable a redirection host', async () => {
      const response = await client.enableRedirectionHost(createdRedirectionHostId);
      expect(response.status).toBe(200);
    });

    test('should delete a redirection host', async () => {
      const response = await client.deleteRedirectionHost(createdRedirectionHostId);
      expect(response.status).toBe(200);
    });

    test('should return 404 for non-existent redirection host', async () => {
      await expect(client.getRedirectionHost(999999)).rejects.toMatchObject({
        response: { status: 404 }
      });
    });
  });

  describe('Dead Hosts (404 Hosts)', () => {
    test('should list dead hosts', async () => {
      const response = await client.getDeadHosts();
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('should list dead hosts with expand parameter', async () => {
      const response = await client.getDeadHosts('owner,certificate');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('should create a dead host', async () => {
      const deadHostData = {
        domain_names: ['404.example.com'],
        ssl_forced: false,
        hsts_enabled: false,
        http2_support: false,
        enabled: true
      };

      const response = await client.createDeadHost(deadHostData);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.domain_names).toEqual(['404.example.com']);
      
      createdDeadHostId = response.data.id;
    });

    test('should get a specific dead host', async () => {
      const response = await client.getDeadHost(createdDeadHostId);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', createdDeadHostId);
      expect(response.data.domain_names).toEqual(['404.example.com']);
    });

    test('should update a dead host', async () => {
      const updateData = {
        ssl_forced: true,
        hsts_enabled: true
      };

      const response = await client.updateDeadHost(createdDeadHostId, updateData);
      expect(response.status).toBe(200);
      expect(response.data.ssl_forced).toBe(true);
      expect(response.data.hsts_enabled).toBe(true);
    });

    test('should disable a dead host', async () => {
      const response = await client.disableDeadHost(createdDeadHostId);
      expect(response.status).toBe(200);
    });

    test('should enable a dead host', async () => {
      const response = await client.enableDeadHost(createdDeadHostId);
      expect(response.status).toBe(200);
    });

    test('should delete a dead host', async () => {
      const response = await client.deleteDeadHost(createdDeadHostId);
      expect(response.status).toBe(200);
    });

    test('should return 404 for non-existent dead host', async () => {
      await expect(client.getDeadHost(999999)).rejects.toMatchObject({
        response: { status: 404 }
      });
    });
  });

  describe('Audit Log', () => {
    test('should get audit log', async () => {
      const response = await client.getAuditLog();
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // If there are audit log entries, check their structure
      if (response.data.length > 0) {
        expect(response.data[0]).toHaveProperty('user_id');
        expect(response.data[0]).toHaveProperty('object_type');
        expect(response.data[0]).toHaveProperty('object_id');
        expect(response.data[0]).toHaveProperty('action');
        expect(response.data[0]).toHaveProperty('created_on');
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const badClient = new NginxProxyManagerClient('http://nonexistent:9999/api');
      
      await expect(badClient.getProxyHosts()).rejects.toThrow();
    });

    test('should handle unauthorized requests', async () => {
      const unauthClient = new NginxProxyManagerClient(TEST_CONFIG.NPM_BASE_URL);
      
      await expect(unauthClient.getProxyHosts()).rejects.toMatchObject({
        response: { status: 403 }
      });
    });
  });
});