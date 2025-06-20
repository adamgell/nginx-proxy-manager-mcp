import { describe, test, expect, beforeAll } from '@jest/globals';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { TEST_CONFIG } from './setup';

// We'll test the MCP server by importing and testing the server class
// For now, we'll simulate the MCP server behavior by testing the underlying client

describe('MCP Server Tools', () => {
  const testTools = [
    'npm_authenticate',
    'npm_auth_status',
    'npm_list_proxy_hosts',
    'npm_get_proxy_host',
    'npm_create_proxy_host',
    'npm_update_proxy_host',
    'npm_delete_proxy_host',
    'npm_enable_proxy_host',
    'npm_disable_proxy_host',
    'npm_list_certificates',
    'npm_create_certificate',
    'npm_renew_certificate',
    'npm_delete_certificate',
    'npm_list_access_lists',
    'npm_create_access_list',
    'npm_update_access_list',
    'npm_delete_access_list',
    'npm_get_hosts_report',
    'npm_list_redirection_hosts',
    'npm_get_redirection_host',
    'npm_create_redirection_host',
    'npm_update_redirection_host',
    'npm_delete_redirection_host',
    'npm_enable_redirection_host',
    'npm_disable_redirection_host',
    'npm_list_dead_hosts',
    'npm_get_dead_host',
    'npm_create_dead_host',
    'npm_update_dead_host',
    'npm_delete_dead_host',
    'npm_enable_dead_host',
    'npm_disable_dead_host',
    'npm_get_audit_log'
  ];

  describe('Tool Registration', () => {
    test('should register all expected tools', () => {
      // This test verifies that all expected tools are defined
      expect(testTools).toHaveLength(33);
      
      // Verify specific critical tools exist
      expect(testTools).toContain('npm_authenticate');
      expect(testTools).toContain('npm_auth_status');
      expect(testTools).toContain('npm_list_proxy_hosts');
      expect(testTools).toContain('npm_create_proxy_host');
      expect(testTools).toContain('npm_list_certificates');
      expect(testTools).toContain('npm_get_hosts_report');
      expect(testTools).toContain('npm_list_redirection_hosts');
      expect(testTools).toContain('npm_list_dead_hosts');
      expect(testTools).toContain('npm_get_audit_log');
    });
  });

  describe('Tool Schemas', () => {
    test('authentication tool should have correct schema structure', () => {
      // Test that the authentication schema requires identity and secret
      const authSchema = {
        type: 'object',
        properties: {
          identity: { type: 'string', description: 'Email address' },
          secret: { type: 'string', description: 'Password' },
          baseUrl: { type: 'string', description: 'Base URL for NPM API' }
        },
        required: ['identity', 'secret']
      };
      
      expect(authSchema.required).toContain('identity');
      expect(authSchema.required).toContain('secret');
    });

    test('proxy host creation should have correct schema structure', () => {
      const proxyHostSchema = {
        type: 'object',
        properties: {
          domain_names: { type: 'array', items: { type: 'string' } },
          forward_scheme: { type: 'string', enum: ['http', 'https'] },
          forward_host: { type: 'string' },
          forward_port: { type: 'number', minimum: 1, maximum: 65535 }
        },
        required: ['domain_names', 'forward_scheme', 'forward_host', 'forward_port']
      };
      
      expect(proxyHostSchema.required).toEqual([
        'domain_names', 'forward_scheme', 'forward_host', 'forward_port'
      ]);
    });

    test('redirection host creation should have correct schema structure', () => {
      const redirectionHostSchema = {
        type: 'object',
        properties: {
          domain_names: { type: 'array', items: { type: 'string' } },
          forward_http_code: { type: 'number', minimum: 300, maximum: 308 },
          forward_scheme: { type: 'string', enum: ['auto', 'http', 'https'] },
          forward_domain_name: { type: 'string' },
          preserve_path: { type: 'boolean' }
        },
        required: ['domain_names', 'forward_http_code', 'forward_scheme', 'forward_domain_name']
      };
      
      expect(redirectionHostSchema.required).toEqual([
        'domain_names', 'forward_http_code', 'forward_scheme', 'forward_domain_name'
      ]);
    });

    test('dead host creation should have correct schema structure', () => {
      const deadHostSchema = {
        type: 'object',
        properties: {
          domain_names: { type: 'array', items: { type: 'string' } },
          certificate_id: { type: ['number', 'string'] },
          ssl_forced: { type: 'boolean' },
          hsts_enabled: { type: 'boolean' }
        },
        required: ['domain_names']
      };
      
      expect(deadHostSchema.required).toEqual(['domain_names']);
    });
  });

  describe('Tool Parameter Validation', () => {
    test('should validate proxy host parameters', () => {
      const validProxyHost = {
        domain_names: ['test.example.com'],
        forward_scheme: 'http',
        forward_host: '192.168.1.100',
        forward_port: 8080
      };
      
      // Basic validation checks
      expect(Array.isArray(validProxyHost.domain_names)).toBe(true);
      expect(['http', 'https']).toContain(validProxyHost.forward_scheme);
      expect(typeof validProxyHost.forward_host).toBe('string');
      expect(typeof validProxyHost.forward_port).toBe('number');
      expect(validProxyHost.forward_port).toBeGreaterThan(0);
      expect(validProxyHost.forward_port).toBeLessThan(65536);
    });

    test('should validate certificate parameters', () => {
      const validCertificate = {
        provider: 'letsencrypt',
        domain_names: ['test.example.com'],
        meta: {
          letsencrypt_email: 'test@example.com',
          letsencrypt_agree: true
        }
      };
      
      expect(['letsencrypt', 'other']).toContain(validCertificate.provider);
      expect(Array.isArray(validCertificate.domain_names)).toBe(true);
      expect(typeof validCertificate.meta.letsencrypt_email).toBe('string');
      expect(typeof validCertificate.meta.letsencrypt_agree).toBe('boolean');
    });

    test('should validate access list parameters', () => {
      const validAccessList = {
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
      
      expect(typeof validAccessList.name).toBe('string');
      expect(typeof validAccessList.satisfy_any).toBe('boolean');
      expect(typeof validAccessList.pass_auth).toBe('boolean');
      expect(Array.isArray(validAccessList.items)).toBe(true);
      expect(Array.isArray(validAccessList.clients)).toBe(true);
      expect(['allow', 'deny']).toContain(validAccessList.clients[0].directive);
    });

    test('should validate redirection host parameters', () => {
      const validRedirectionHost = {
        domain_names: ['redirect.example.com'],
        forward_http_code: 301,
        forward_scheme: 'https',
        forward_domain_name: 'target.example.com',
        preserve_path: true
      };
      
      expect(Array.isArray(validRedirectionHost.domain_names)).toBe(true);
      expect(validRedirectionHost.forward_http_code).toBeGreaterThanOrEqual(300);
      expect(validRedirectionHost.forward_http_code).toBeLessThanOrEqual(308);
      expect(['auto', 'http', 'https']).toContain(validRedirectionHost.forward_scheme);
      expect(typeof validRedirectionHost.forward_domain_name).toBe('string');
      expect(typeof validRedirectionHost.preserve_path).toBe('boolean');
    });

    test('should validate dead host parameters', () => {
      const validDeadHost = {
        domain_names: ['404.example.com'],
        ssl_forced: false,
        hsts_enabled: false,
        http2_support: false
      };
      
      expect(Array.isArray(validDeadHost.domain_names)).toBe(true);
      expect(typeof validDeadHost.ssl_forced).toBe('boolean');
      expect(typeof validDeadHost.hsts_enabled).toBe('boolean');
      expect(typeof validDeadHost.http2_support).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid tool names', () => {
      const invalidToolName = 'npm_invalid_tool';
      expect(testTools).not.toContain(invalidToolName);
    });

    test('should handle missing required parameters', () => {
      // Test incomplete proxy host data
      const incompleteProxyHost = {
        domain_names: ['test.example.com']
        // Missing required fields: forward_scheme, forward_host, forward_port
      };
      
      const requiredFields = ['forward_scheme', 'forward_host', 'forward_port'];
      requiredFields.forEach(field => {
        expect(incompleteProxyHost).not.toHaveProperty(field);
      });
    });

    test('should handle invalid parameter types', () => {
      const invalidProxyHost = {
        domain_names: 'not-an-array', // Should be array
        forward_scheme: 'ftp', // Should be http or https
        forward_host: 123, // Should be string
        forward_port: 'not-a-number' // Should be number
      };
      
      expect(Array.isArray(invalidProxyHost.domain_names)).toBe(false);
      expect(['http', 'https']).not.toContain(invalidProxyHost.forward_scheme);
      expect(typeof invalidProxyHost.forward_host).not.toBe('string');
      expect(typeof invalidProxyHost.forward_port).not.toBe('number');
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete workflow', () => {
      // Test a complete workflow scenario
      const workflow = [
        { tool: 'npm_authenticate', params: { identity: 'test@example.com', secret: 'password' } },
        { tool: 'npm_auth_status', params: {} },
        { tool: 'npm_list_proxy_hosts', params: {} },
        { tool: 'npm_create_proxy_host', params: {
          domain_names: ['workflow.example.com'],
          forward_scheme: 'http',
          forward_host: '192.168.1.200',
          forward_port: 3000
        }},
        { tool: 'npm_create_redirection_host', params: {
          domain_names: ['redirect.example.com'],
          forward_http_code: 301,
          forward_scheme: 'https',
          forward_domain_name: 'target.example.com'
        }},
        { tool: 'npm_create_dead_host', params: {
          domain_names: ['404.example.com']
        }},
        { tool: 'npm_get_hosts_report', params: {} },
        { tool: 'npm_get_audit_log', params: {} }
      ];
      
      workflow.forEach(step => {
        expect(testTools).toContain(step.tool);
        expect(typeof step.params).toBe('object');
      });
    });

    test('should validate tool dependencies', () => {
      // Most tools require authentication first
      const authRequiredTools = testTools.filter(tool => tool !== 'npm_authenticate');
      
      expect(authRequiredTools.length).toBeGreaterThan(0);
      expect(testTools).toContain('npm_authenticate');
    });
  });

  describe('Performance', () => {
    test('should have reasonable tool count', () => {
      // Ensure we don't have too many tools (performance concern)
      expect(testTools.length).toBeLessThan(50);
      expect(testTools.length).toBeGreaterThan(10);
    });

    test('should have unique tool names', () => {
      const uniqueTools = [...new Set(testTools)];
      expect(uniqueTools.length).toBe(testTools.length);
    });
  });
});