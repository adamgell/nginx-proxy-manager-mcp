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

// API Client for Nginx Proxy Manager
class NginxProxyManagerClient {
  private client: AxiosInstance;
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

  async getCertificate(id: number) {
    return this.client.get(`/nginx/certificates/${id}`);
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

  async getAccessList(id: number) {
    return this.client.get(`/nginx/access-lists/${id}`);
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

  // Users
  async getUsers(expand?: string) {
    const params = expand ? { expand } : {};
    return this.client.get('/users', { params });
  }

  async getUser(id: number | 'me') {
    return this.client.get(`/users/${id}`);
  }

  async createUser(data: any) {
    return this.client.post('/users', data);
  }

  async updateUser(id: number | 'me', data: any) {
    return this.client.put(`/users/${id}`, data);
  }

  async deleteUser(id: number) {
    return this.client.delete(`/users/${id}`);
  }

  // Streams
  async getStreams(expand?: string) {
    const params = expand ? { expand } : {};
    return this.client.get('/nginx/streams', { params });
  }

  async createStream(data: any) {
    return this.client.post('/nginx/streams', data);
  }

  async updateStream(id: number, data: any) {
    return this.client.put(`/nginx/streams/${id}`, data);
  }

  async deleteStream(id: number) {
    return this.client.delete(`/nginx/streams/${id}`);
  }

  // Settings
  async getSettings() {
    return this.client.get('/settings');
  }

  async getSetting(id: string) {
    return this.client.get(`/settings/${id}`);
  }

  async updateSetting(id: string, data: any) {
    return this.client.put(`/settings/${id}`, data);
  }

  // Reports
  async getHostsReport() {
    return this.client.get('/reports/hosts');
  }
}

// Tool Schemas
const AuthenticateSchema = z.object({
  identity: z.string().describe('Username or email'),
  secret: z.string().describe('Password'),
});

const ProxyHostSchema = z.object({
  domain_names: z.array(z.string()).describe('Array of domain names'),
  forward_scheme: z.enum(['http', 'https']).describe('Forward scheme'),
  forward_host: z.string().describe('Forward host'),
  forward_port: z.number().min(1).max(65535).describe('Forward port'),
  certificate_id: z.union([z.number().min(0), z.literal('new')]).optional(),
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

// MCP Server
class NginxProxyManagerMCPServer {
  private server: Server;
  private client: NginxProxyManagerClient;

  constructor() {
    this.server = new Server(
      {
        name: 'nginx-proxy-manager-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize with environment variables
    const baseUrl = process.env.NPM_BASE_URL || 'http://localhost:81/api';
    this.client = new NginxProxyManagerClient(baseUrl);

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'npm_authenticate',
          description: 'Authenticate with Nginx Proxy Manager',
          inputSchema: AuthenticateSchema,
        },
        {
          name: 'npm_list_proxy_hosts',
          description: 'List all proxy hosts',
          inputSchema: z.object({
            expand: z.string().optional().describe('Expand: owner, certificate, access_list'),
          }),
        },
        {
          name: 'npm_get_proxy_host',
          description: 'Get a specific proxy host',
          inputSchema: z.object({
            id: z.number().describe('Proxy host ID'),
          }),
        },
        {
          name: 'npm_create_proxy_host',
          description: 'Create a new proxy host',
          inputSchema: ProxyHostSchema,
        },
        {
          name: 'npm_update_proxy_host',
          description: 'Update an existing proxy host',
          inputSchema: z.object({
            id: z.number().describe('Proxy host ID'),
            data: ProxyHostSchema.partial(),
          }),
        },
        {
          name: 'npm_delete_proxy_host',
          description: 'Delete a proxy host',
          inputSchema: z.object({
            id: z.number().describe('Proxy host ID'),
          }),
        },
        {
          name: 'npm_enable_proxy_host',
          description: 'Enable a proxy host',
          inputSchema: z.object({
            id: z.number().describe('Proxy host ID'),
          }),
        },
        {
          name: 'npm_disable_proxy_host',
          description: 'Disable a proxy host',
          inputSchema: z.object({
            id: z.number().describe('Proxy host ID'),
          }),
        },
        {
          name: 'npm_list_certificates',
          description: 'List all certificates',
          inputSchema: z.object({
            expand: z.string().optional().describe('Expand: owner'),
          }),
        },
        {
          name: 'npm_create_certificate',
          description: 'Create a new certificate',
          inputSchema: CertificateSchema,
        },
        {
          name: 'npm_renew_certificate',
          description: 'Renew a certificate',
          inputSchema: z.object({
            id: z.number().describe('Certificate ID'),
          }),
        },
        {
          name: 'npm_delete_certificate',
          description: 'Delete a certificate',
          inputSchema: z.object({
            id: z.number().describe('Certificate ID'),
          }),
        },
        {
          name: 'npm_list_access_lists',
          description: 'List all access lists',
          inputSchema: z.object({
            expand: z.string().optional().describe('Expand: owner, items, clients, proxy_hosts'),
          }),
        },
        {
          name: 'npm_create_access_list',
          description: 'Create a new access list',
          inputSchema: AccessListSchema,
        },
        {
          name: 'npm_update_access_list',
          description: 'Update an access list',
          inputSchema: z.object({
            id: z.number().describe('Access list ID'),
            data: AccessListSchema.partial(),
          }),
        },
        {
          name: 'npm_delete_access_list',
          description: 'Delete an access list',
          inputSchema: z.object({
            id: z.number().describe('Access list ID'),
          }),
        },
        {
          name: 'npm_get_hosts_report',
          description: 'Get hosts statistics report',
          inputSchema: z.object({}),
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'npm_authenticate': {
            const { identity, secret } = AuthenticateSchema.parse(args);
            await this.client.authenticate(identity, secret);
            return { content: [{ type: 'text', text: 'Authentication successful' }] };
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
            const response = await this.client.getAccessLists(expand);
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
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

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error: any) {
        if (error.response) {
          throw new McpError(
            ErrorCode.InternalError,
            `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
          );
        }
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Nginx Proxy Manager MCP server running on stdio');
  }
}

// Main
const server = new NginxProxyManagerMCPServer();
server.run().catch(console.error);
