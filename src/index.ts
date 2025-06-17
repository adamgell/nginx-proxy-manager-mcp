#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Enhanced logging utility
class Logger {
  private enabled: boolean;
  
  constructor() {
    this.enabled = process.env.NPM_MCP_DEBUG === 'true';
  }
  
  log(message: string, data?: any) {
    if (this.enabled) {
      console.error(`[NPM-MCP] ${new Date().toISOString()} - ${message}`);
      if (data) {
        console.error(JSON.stringify(data, null, 2));
      }
    }
  }
  
  error(message: string, error?: any) {
    console.error(`[NPM-MCP ERROR] ${new Date().toISOString()} - ${message}`);
    if (error) {
      console.error(error);
    }
  }
}

const logger = new Logger();

// Enhanced API Client with authentication state
class NginxProxyManagerClient {
  private baseUrl: string;
  private axios: AxiosInstance;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.axios = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    
    // Add request interceptor for auth
    this.axios.interceptors.request.use((config) => {
      if (this.token && this.isTokenValid()) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      logger.log(`Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });
    
    // Add response interceptor for debugging
    this.axios.interceptors.response.use(
      (response) => {
        logger.log(`Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error(`Response Error: ${error.response?.status} ${error.config?.url}`, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  updateBaseUrl(newBaseUrl: string) {
    this.baseUrl = newBaseUrl;
    this.axios.defaults.baseURL = newBaseUrl;
    logger.log(`Updated base URL to: ${newBaseUrl}`);
  }

  isAuthenticated(): boolean {
    return this.token !== null && this.isTokenValid();
  }
  
  private isTokenValid(): boolean {
    if (!this.tokenExpiry) return false;
    return new Date() < this.tokenExpiry;
  }
  
  getAuthStatus(): { authenticated: boolean; expiresAt?: string } {
    if (!this.isAuthenticated()) {
      return { authenticated: false };
    }
    return { 
      authenticated: true, 
      expiresAt: this.tokenExpiry?.toISOString() 
    };
  }

  async authenticate(identity: string, secret: string) {
    try {
      const response = await this.axios.post('/tokens', { identity, secret });
      this.token = response.data.token;
      // NPM tokens typically expire after 1 hour
      this.tokenExpiry = new Date(Date.now() + 3600000);
      logger.log('Authentication successful', { identity, expiresAt: this.tokenExpiry });
      return response;
    } catch (error) {
      this.token = null;
      this.tokenExpiry = null;
      throw error;
    }
  }
  
  // Proxy Hosts
  async getProxyHosts(expand?: string) {
    this.requireAuth();
    const params = expand ? { expand } : {};
    return this.axios.get('/nginx/proxy-hosts', { params });
  }

  async getProxyHost(id: number) {
    this.requireAuth();
    return this.axios.get(`/nginx/proxy-hosts/${id}`);
  }

  async createProxyHost(data: any) {
    this.requireAuth();
    return this.axios.post('/nginx/proxy-hosts', data);
  }

  async updateProxyHost(id: number, data: any) {
    this.requireAuth();
    return this.axios.put(`/nginx/proxy-hosts/${id}`, data);
  }

  async deleteProxyHost(id: number) {
    this.requireAuth();
    return this.axios.delete(`/nginx/proxy-hosts/${id}`);
  }

  async enableProxyHost(id: number) {
    this.requireAuth();
    return this.axios.post(`/nginx/proxy-hosts/${id}/enable`);
  }

  async disableProxyHost(id: number) {
    this.requireAuth();
    return this.axios.post(`/nginx/proxy-hosts/${id}/disable`);
  }

  // Certificates
  async getCertificates(expand?: string) {
    this.requireAuth();
    const params = expand ? { expand } : {};
    return this.axios.get('/nginx/certificates', { params });
  }

  async createCertificate(data: any) {
    this.requireAuth();
    return this.axios.post('/nginx/certificates', data);
  }

  async renewCertificate(id: number) {
    this.requireAuth();
    return this.axios.post(`/nginx/certificates/${id}/renew`);
  }

  async deleteCertificate(id: number) {
    this.requireAuth();
    return this.axios.delete(`/nginx/certificates/${id}`);
  }

  // Access Lists
  async getAccessLists(expand?: string) {
    this.requireAuth();
    const params = expand ? { expand } : {};
    return this.axios.get('/nginx/access-lists', { params });
  }

  async createAccessList(data: any) {
    this.requireAuth();
    return this.axios.post('/nginx/access-lists', data);
  }

  async updateAccessList(id: number, data: any) {
    this.requireAuth();
    return this.axios.put(`/nginx/access-lists/${id}`, data);
  }

  async deleteAccessList(id: number) {
    this.requireAuth();
    return this.axios.delete(`/nginx/access-lists/${id}`);
  }

  // Reports
  async getHostsReport() {
    this.requireAuth();
    return this.axios.get('/reports/hosts');
  }

  // Redirection Hosts
  async getRedirectionHosts(expand?: string) {
    this.requireAuth();
    const params = expand ? { expand } : {};
    return this.axios.get('/nginx/redirection-hosts', { params });
  }

  async getRedirectionHost(id: number) {
    this.requireAuth();
    return this.axios.get(`/nginx/redirection-hosts/${id}`);
  }

  async createRedirectionHost(data: any) {
    this.requireAuth();
    return this.axios.post('/nginx/redirection-hosts', data);
  }

  async updateRedirectionHost(id: number, data: any) {
    this.requireAuth();
    return this.axios.put(`/nginx/redirection-hosts/${id}`, data);
  }

  async deleteRedirectionHost(id: number) {
    this.requireAuth();
    return this.axios.delete(`/nginx/redirection-hosts/${id}`);
  }

  async enableRedirectionHost(id: number) {
    this.requireAuth();
    return this.axios.post(`/nginx/redirection-hosts/${id}/enable`);
  }

  async disableRedirectionHost(id: number) {
    this.requireAuth();
    return this.axios.post(`/nginx/redirection-hosts/${id}/disable`);
  }

  // Dead Hosts (404 Hosts)
  async getDeadHosts(expand?: string) {
    this.requireAuth();
    const params = expand ? { expand } : {};
    return this.axios.get('/nginx/dead-hosts', { params });
  }

  async getDeadHost(id: number) {
    this.requireAuth();
    return this.axios.get(`/nginx/dead-hosts/${id}`);
  }

  async createDeadHost(data: any) {
    this.requireAuth();
    // Convert boolean values to numeric for compatibility
    const convertedData = this.convertBooleansToNumeric(data);
    return this.axios.post('/nginx/dead-hosts', convertedData);
  }

  async updateDeadHost(id: number, data: any) {
    this.requireAuth();
    // Convert boolean values to numeric for compatibility
    const convertedData = this.convertBooleansToNumeric(data);
    return this.axios.put(`/nginx/dead-hosts/${id}`, convertedData);
  }
  
  private convertBooleansToNumeric(data: any): any {
    const booleanFields = ['ssl_forced', 'hsts_enabled', 'hsts_subdomains', 'http2_support'];
    const converted = { ...data };
    
    booleanFields.forEach(field => {
      if (field in converted && typeof converted[field] === 'boolean') {
        converted[field] = converted[field] ? 1 : 0;
      }
    });
    
    return converted;
  }

  async deleteDeadHost(id: number) {
    this.requireAuth();
    return this.axios.delete(`/nginx/dead-hosts/${id}`);
  }

  async enableDeadHost(id: number) {
    this.requireAuth();
    return this.axios.post(`/nginx/dead-hosts/${id}/enable`);
  }

  async disableDeadHost(id: number) {
    this.requireAuth();
    return this.axios.post(`/nginx/dead-hosts/${id}/disable`);
  }

  // Audit Log
  async getAuditLog() {
    this.requireAuth();
    return this.axios.get('/audit-log');
  }
  
  private requireAuth() {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please call npm_authenticate first.');
    }
  }
}

// Schemas
const AuthenticateSchema = z.object({
  identity: z.string().describe('Email address'),
  secret: z.string().describe('Password'),
  baseUrl: z.string().optional().describe('Base URL for NPM API (e.g., http://192.168.2.4:81/api)'),
});

const ProxyHostSchema = z.object({
  domain_names: z.array(z.string()).describe('Array of domain names'),
  forward_scheme: z.enum(['http', 'https']).describe('Forward scheme'),
  forward_host: z.string().describe('Forward host'),
  forward_port: z.number().min(1).max(65535).describe('Forward port'),
  certificate_id: z.union([
    z.number().min(0),
    z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)),
    z.literal('new'),
    z.literal(0)
  ]).optional(),
  ssl_forced: z.boolean().optional(),
  hsts_enabled: z.boolean().optional(),
  hsts_subdomains: z.boolean().optional(),
  http2_support: z.boolean().optional(),
  block_exploits: z.boolean().optional(),
  caching_enabled: z.boolean().optional(),
  allow_websocket_upgrade: z.boolean().optional(),
  access_list_id: z.number().min(0).optional(),
  advanced_config: z.string().optional(),
  enabled: z.boolean().optional(),
});

const CertificateSchema = z.object({
  provider: z.enum(['letsencrypt', 'other']),
  nice_name: z.string().optional(),
  domain_names: z.array(z.string()),
  meta: z.object({
    letsencrypt_email: z.string().optional(),
    letsencrypt_agree: z.boolean().optional(),
    dns_challenge: z.boolean().optional(),
    dns_provider: z.string().optional(),
    dns_provider_credentials: z.string().optional(),
  }).optional(),
});

const AccessListSchema = z.object({
  name: z.string(),
  satisfy_any: z.boolean().optional(),
  pass_auth: z.boolean().optional(),
  items: z.array(z.object({
    username: z.string(),
    password: z.string(),
  })).optional(),
  clients: z.array(z.object({
    address: z.string(),
    directive: z.enum(['allow', 'deny']),
  })).optional(),
});

const RedirectionHostSchema = z.object({
  domain_names: z.array(z.string()).describe('Array of domain names'),
  forward_http_code: z.number().min(300).max(308).describe('Redirect HTTP Status Code'),
  forward_scheme: z.enum(['auto', 'http', 'https']).describe('Forward scheme'),
  forward_domain_name: z.string().describe('Target domain name'),
  preserve_path: z.boolean().optional().describe('Should the path be preserved'),
  certificate_id: z.union([
    z.number().min(0),
    z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)),
    z.literal('new'),
    z.literal(0)
  ]).optional(),
  ssl_forced: z.boolean().optional(),
  hsts_enabled: z.boolean().optional(),
  hsts_subdomains: z.boolean().optional(),
  http2_support: z.boolean().optional(),
  block_exploits: z.boolean().optional(),
  advanced_config: z.string().optional(),
  meta: z.object({}).optional(),
});

const DeadHostSchema = z.object({
  domain_names: z.array(z.string()).describe('Array of domain names'),
  certificate_id: z.union([
    z.number().min(0),
    z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)),
    z.literal('new'),
    z.literal(0)
  ]).optional(),
  ssl_forced: z.boolean().optional(),
  hsts_enabled: z.boolean().optional(),
  hsts_subdomains: z.boolean().optional(),
  http2_support: z.boolean().optional(),
  advanced_config: z.string().optional(),
  meta: z.object({}).optional(),
});

// Enhanced MCP Server
class NginxProxyManagerMCPServer {
  private server: Server;
  private client: NginxProxyManagerClient;

  constructor() {
    this.server = new Server(
      {
        name: 'nginx-proxy-manager-mcp',
        version: '1.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize with environment variables
    const baseUrl = process.env.NPM_BASE_URL || 'http://localhost:81/api';
    logger.log(`Initializing with base URL: ${baseUrl}`);
    this.client = new NginxProxyManagerClient(baseUrl);

    this.setupHandlers();
  }

  private setupHandlers() {
    // Helper to convert Zod schema to JSON Schema format for MCP
    const toJsonSchema = (schema: z.ZodSchema<any>) => {
      const jsonSchema = zodToJsonSchema(schema, { $refStrategy: 'none' });
      // Ensure the schema has type: "object" at the root level
      if (typeof jsonSchema === 'object' && jsonSchema !== null && !('type' in jsonSchema)) {
        return { ...jsonSchema, type: 'object' };
      }
      return jsonSchema;
    };

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [
        {
          name: 'npm_authenticate',
          description: 'Authenticate with Nginx Proxy Manager. Required before using other tools.',
          inputSchema: toJsonSchema(AuthenticateSchema),
        },
        {
          name: 'npm_auth_status',
          description: 'Check current authentication status',
          inputSchema: toJsonSchema(z.object({})),
        },
        {
          name: 'npm_list_proxy_hosts',
          description: 'List all proxy hosts',
          inputSchema: toJsonSchema(z.object({
            expand: z.string().optional().describe('Expand: owner, certificate, access_list'),
          })),
        },
        {
          name: 'npm_get_proxy_host',
          description: 'Get a specific proxy host',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('Proxy host ID'),
          })),
        },
        {
          name: 'npm_create_proxy_host',
          description: 'Create a new proxy host',
          inputSchema: toJsonSchema(ProxyHostSchema),
        },
        {
          name: 'npm_update_proxy_host',
          description: 'Update an existing proxy host',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('Proxy host ID'),
            data: ProxyHostSchema.partial(),
          })),
        },
        {
          name: 'npm_delete_proxy_host',
          description: 'Delete a proxy host',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('Proxy host ID'),
          })),
        },
        {
          name: 'npm_enable_proxy_host',
          description: 'Enable a proxy host',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('Proxy host ID'),
          })),
        },
        {
          name: 'npm_disable_proxy_host',
          description: 'Disable a proxy host',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('Proxy host ID'),
          })),
        },
        {
          name: 'npm_list_certificates',
          description: 'List all certificates',
          inputSchema: toJsonSchema(z.object({
            expand: z.string().optional().describe('Expand: owner'),
          })),
        },
        {
          name: 'npm_create_certificate',
          description: 'Create a new certificate',
          inputSchema: toJsonSchema(CertificateSchema),
        },
        {
          name: 'npm_renew_certificate',
          description: 'Renew a certificate',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('Certificate ID'),
          })),
        },
        {
          name: 'npm_delete_certificate',
          description: 'Delete a certificate',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('Certificate ID'),
          })),
        },
        {
          name: 'npm_list_access_lists',
          description: 'List all access lists',
          inputSchema: toJsonSchema(z.object({
            expand: z.string().optional().describe('Expand: owner, items, clients, proxy_hosts'),
          })),
        },
        {
          name: 'npm_create_access_list',
          description: 'Create a new access list',
          inputSchema: toJsonSchema(AccessListSchema),
        },
        {
          name: 'npm_update_access_list',
          description: 'Update an access list',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('Access list ID'),
            data: AccessListSchema.partial(),
          })),
        },
        {
          name: 'npm_delete_access_list',
          description: 'Delete an access list',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('Access list ID'),
          })),
        },
        {
          name: 'npm_get_hosts_report',
          description: 'Get hosts statistics report',
          inputSchema: toJsonSchema(z.object({})),
        },
        // Redirection Hosts
        {
          name: 'npm_list_redirection_hosts',
          description: 'List all redirection hosts',
          inputSchema: toJsonSchema(z.object({
            expand: z.string().optional().describe('Expand: owner, certificate'),
          })),
        },
        {
          name: 'npm_get_redirection_host',
          description: 'Get a specific redirection host',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('Redirection host ID'),
          })),
        },
        {
          name: 'npm_create_redirection_host',
          description: 'Create a new redirection host',
          inputSchema: toJsonSchema(RedirectionHostSchema),
        },
        {
          name: 'npm_update_redirection_host',
          description: 'Update an existing redirection host',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('Redirection host ID'),
            data: RedirectionHostSchema.partial(),
          })),
        },
        {
          name: 'npm_delete_redirection_host',
          description: 'Delete a redirection host',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('Redirection host ID'),
          })),
        },
        {
          name: 'npm_enable_redirection_host',
          description: 'Enable a redirection host',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('Redirection host ID'),
          })),
        },
        {
          name: 'npm_disable_redirection_host',
          description: 'Disable a redirection host',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('Redirection host ID'),
          })),
        },
        // Dead Hosts (404 Hosts)
        {
          name: 'npm_list_dead_hosts',
          description: 'List all 404 hosts',
          inputSchema: toJsonSchema(z.object({
            expand: z.string().optional().describe('Expand: owner, certificate'),
          })),
        },
        {
          name: 'npm_get_dead_host',
          description: 'Get a specific 404 host',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('404 host ID'),
          })),
        },
        {
          name: 'npm_create_dead_host',
          description: 'Create a new 404 host',
          inputSchema: toJsonSchema(DeadHostSchema),
        },
        {
          name: 'npm_update_dead_host',
          description: 'Update an existing 404 host',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('404 host ID'),
            data: DeadHostSchema.partial(),
          })),
        },
        {
          name: 'npm_delete_dead_host',
          description: 'Delete a 404 host',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('404 host ID'),
          })),
        },
        {
          name: 'npm_enable_dead_host',
          description: 'Enable a 404 host',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('404 host ID'),
          })),
        },
        {
          name: 'npm_disable_dead_host',
          description: 'Disable a 404 host',
          inputSchema: toJsonSchema(z.object({
            id: z.number().describe('404 host ID'),
          })),
        },
        // Audit Log
        {
          name: 'npm_get_audit_log',
          description: 'Get the audit log with optional pagination',
          inputSchema: toJsonSchema(z.object({
            limit: z.number().min(1).max(1000).optional().describe('Maximum number of items to return (default: 100)'),
            offset: z.number().min(0).optional().describe('Number of items to skip (default: 0)'),
          })),
        },
      ];
      
      logger.log(`Returning ${tools.length} tools`);
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.log(`Tool called: ${name}`, args);

      try {
        switch (name) {
          case 'npm_authenticate': {
            const { identity, secret, baseUrl } = AuthenticateSchema.parse(args);
            if (baseUrl) {
              this.client.updateBaseUrl(baseUrl);
            }
            const response = await this.client.authenticate(identity, secret);
            return { 
              content: [{ 
                type: 'text', 
                text: `Authentication successful. Token stored for future requests.\nExpires at: ${this.client.getAuthStatus().expiresAt}` 
              }] 
            };
          }
          
          case 'npm_auth_status': {
            const status = this.client.getAuthStatus();
            return { 
              content: [{ 
                type: 'text', 
                text: JSON.stringify(status, null, 2) 
              }] 
            };
          }

          case 'npm_list_proxy_hosts': {
            const { expand } = args as { expand?: string };
            const response = await this.client.getProxyHosts(expand);
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'npm_get_proxy_host': {
            const { id } = args as { id: number };
            const response = await this.client.getProxyHost(id);
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'npm_create_proxy_host': {
            const data = ProxyHostSchema.parse(args);
            const response = await this.client.createProxyHost(data);
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'npm_update_proxy_host': {
            const { id, data } = args as { id: number; data: any };
            const response = await this.client.updateProxyHost(id, data);
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'npm_delete_proxy_host': {
            const { id } = args as { id: number };
            await this.client.deleteProxyHost(id);
            return { content: [{ type: 'text', text: 'Proxy host deleted successfully' }] };
          }

          case 'npm_enable_proxy_host': {
            const { id } = args as { id: number };
            await this.client.enableProxyHost(id);
            return { content: [{ type: 'text', text: 'Proxy host enabled successfully' }] };
          }

          case 'npm_disable_proxy_host': {
            const { id } = args as { id: number };
            await this.client.disableProxyHost(id);
            return { content: [{ type: 'text', text: 'Proxy host disabled successfully' }] };
          }

          case 'npm_list_certificates': {
            const { expand } = args as { expand?: string };
            const response = await this.client.getCertificates(expand);
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'npm_create_certificate': {
            const data = CertificateSchema.parse(args);
            const response = await this.client.createCertificate(data);
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'npm_renew_certificate': {
            const { id } = args as { id: number };
            const response = await this.client.renewCertificate(id);
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'npm_delete_certificate': {
            const { id } = args as { id: number };
            await this.client.deleteCertificate(id);
            return { content: [{ type: 'text', text: 'Certificate deleted successfully' }] };
          }

          case 'npm_list_access_lists': {
            const { expand } = args as { expand?: string };
            try {
              const response = await this.client.getAccessLists(expand);
              return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
            } catch (error: any) {
              // Handle server 500 error when using expand parameter
              if (error.response?.status === 500 && expand) {
                logger.log('Access list expand failed, retrying without expand parameter');
                const response = await this.client.getAccessLists();
                return { 
                  content: [{ 
                    type: 'text', 
                    text: `Note: Server returned error with expand parameter. Returning basic list without expansion.\n\n${JSON.stringify(response.data, null, 2)}` 
                  }] 
                };
              }
              throw error;
            }
          }

          case 'npm_create_access_list': {
            const data = AccessListSchema.parse(args);
            const response = await this.client.createAccessList(data);
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'npm_update_access_list': {
            const { id, data } = args as { id: number; data: any };
            const response = await this.client.updateAccessList(id, data);
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'npm_delete_access_list': {
            const { id } = args as { id: number };
            await this.client.deleteAccessList(id);
            return { content: [{ type: 'text', text: 'Access list deleted successfully' }] };
          }

          case 'npm_get_hosts_report': {
            const response = await this.client.getHostsReport();
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          // Redirection Hosts
          case 'npm_list_redirection_hosts': {
            const { expand } = args as { expand?: string };
            const response = await this.client.getRedirectionHosts(expand);
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'npm_get_redirection_host': {
            const { id } = args as { id: number };
            const response = await this.client.getRedirectionHost(id);
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'npm_create_redirection_host': {
            const data = RedirectionHostSchema.parse(args);
            const response = await this.client.createRedirectionHost(data);
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'npm_update_redirection_host': {
            const { id, data } = args as { id: number; data: any };
            const response = await this.client.updateRedirectionHost(id, data);
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'npm_delete_redirection_host': {
            const { id } = args as { id: number };
            await this.client.deleteRedirectionHost(id);
            return { content: [{ type: 'text', text: 'Redirection host deleted successfully' }] };
          }

          case 'npm_enable_redirection_host': {
            const { id } = args as { id: number };
            await this.client.enableRedirectionHost(id);
            return { content: [{ type: 'text', text: 'Redirection host enabled successfully' }] };
          }

          case 'npm_disable_redirection_host': {
            const { id } = args as { id: number };
            await this.client.disableRedirectionHost(id);
            return { content: [{ type: 'text', text: 'Redirection host disabled successfully' }] };
          }

          // Dead Hosts (404 Hosts)
          case 'npm_list_dead_hosts': {
            const { expand } = args as { expand?: string };
            const response = await this.client.getDeadHosts(expand);
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'npm_get_dead_host': {
            const { id } = args as { id: number };
            const response = await this.client.getDeadHost(id);
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'npm_create_dead_host': {
            const data = DeadHostSchema.parse(args);
            const response = await this.client.createDeadHost(data);
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'npm_update_dead_host': {
            const { id, data } = args as { id: number; data: any };
            const response = await this.client.updateDeadHost(id, data);
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'npm_delete_dead_host': {
            const { id } = args as { id: number };
            await this.client.deleteDeadHost(id);
            return { content: [{ type: 'text', text: '404 host deleted successfully' }] };
          }

          case 'npm_enable_dead_host': {
            const { id } = args as { id: number };
            await this.client.enableDeadHost(id);
            return { content: [{ type: 'text', text: '404 host enabled successfully' }] };
          }

          case 'npm_disable_dead_host': {
            const { id } = args as { id: number };
            await this.client.disableDeadHost(id);
            return { content: [{ type: 'text', text: '404 host disabled successfully' }] };
          }

          // Audit Log
          case 'npm_get_audit_log': {
            const { limit = 100, offset = 0 } = args as { limit?: number; offset?: number };
            const response = await this.client.getAuditLog();
            
            // Handle large audit logs by pagination
            const data = response.data;
            if (Array.isArray(data)) {
              const totalItems = data.length;
              const paginatedData = data.slice(offset, offset + limit);
              
              // Create summary for large responses
              if (totalItems > limit) {
                const summary = {
                  total_items: totalItems,
                  returned_items: paginatedData.length,
                  limit: limit,
                  offset: offset,
                  has_more: (offset + limit) < totalItems,
                  next_offset: (offset + limit) < totalItems ? offset + limit : null,
                  items: paginatedData
                };
                return { 
                  content: [{ 
                    type: 'text', 
                    text: JSON.stringify(summary, null, 2) 
                  }] 
                };
              }
            }
            
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error: any) {
        logger.error(`Error executing tool ${name}`, error);
        
        if (error.message?.includes('Not authenticated')) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            'Authentication required. Please use npm_authenticate tool first.'
          );
        }
        
        if (error.response) {
          const status = error.response.status;
          const message = error.response.data?.message || error.response.data?.error || 'Unknown error';
          
          if (status === 401) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              'Authentication failed or token expired. Please authenticate again.'
            );
          }
          
          throw new McpError(
            ErrorCode.InternalError,
            `NPM API Error (${status}): ${message}`
          );
        }
        
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.log('Server started successfully');
    console.error('Nginx Proxy Manager MCP server v1.1.0 running on stdio');
  }
}

// Main
const server = new NginxProxyManagerMCPServer();
server.run().catch((error) => {
  logger.error('Failed to start server', error);
  console.error(error);
  process.exit(1);
});