#!/usr/bin/env node
/**
 * Direct NPM Client - Provides direct access to NPM functionality without MCP overhead
 * This can be imported and used directly in environments where MCP tools aren't available
 */

import axios, { AxiosInstance } from 'axios';

export interface NPMCredentials {
  identity: string;
  secret: string;
}

export interface ProxyHost {
  domain_names: string[];
  forward_scheme: 'http' | 'https';
  forward_host: string;
  forward_port: number;
  certificate_id?: number | 'new';
  ssl_forced?: boolean;
  hsts_enabled?: boolean;
  hsts_subdomains?: boolean;
  http2_support?: boolean;
  block_exploits?: boolean;
  caching_enabled?: boolean;
  allow_websocket_upgrade?: boolean;
  access_list_id?: number;
  advanced_config?: string;
  enabled?: boolean;
}

export class NPMDirectClient {
  private static instance: NPMDirectClient | null = null;
  private axios: AxiosInstance;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NPM_BASE_URL || 'http://localhost:81/api';
    this.axios = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add auth interceptor
    this.axios.interceptors.request.use((config) => {
      if (this.token && this.isTokenValid()) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  static getInstance(baseUrl?: string): NPMDirectClient {
    if (!NPMDirectClient.instance) {
      NPMDirectClient.instance = new NPMDirectClient(baseUrl);
    }
    return NPMDirectClient.instance;
  }

  private isTokenValid(): boolean {
    if (!this.tokenExpiry) return false;
    return new Date() < this.tokenExpiry;
  }

  isAuthenticated(): boolean {
    return this.token !== null && this.isTokenValid();
  }

  async authenticate(identity: string, secret: string): Promise<string> {
    try {
      const response = await this.axios.post('/tokens', { identity, secret });
      this.token = response.data.token;
      this.tokenExpiry = new Date(Date.now() + 3600000); // 1 hour
      return `Authenticated successfully. Token expires at ${this.tokenExpiry.toISOString()}`;
    } catch (error: any) {
      this.token = null;
      this.tokenExpiry = null;
      throw new Error(`Authentication failed: ${error.response?.data?.message || error.message}`);
    }
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

  private requireAuth() {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please authenticate first.');
    }
  }

  // Proxy Hosts
  async listProxyHosts(expand?: string): Promise<any[]> {
    this.requireAuth();
    const params = expand ? { expand } : {};
    const response = await this.axios.get('/nginx/proxy-hosts', { params });
    return response.data;
  }

  async getProxyHost(id: number): Promise<any> {
    this.requireAuth();
    const response = await this.axios.get(`/nginx/proxy-hosts/${id}`);
    return response.data;
  }

  async createProxyHost(data: ProxyHost): Promise<any> {
    this.requireAuth();
    const response = await this.axios.post('/nginx/proxy-hosts', data);
    return response.data;
  }

  async updateProxyHost(id: number, data: Partial<ProxyHost>): Promise<any> {
    this.requireAuth();
    const response = await this.axios.put(`/nginx/proxy-hosts/${id}`, data);
    return response.data;
  }

  async deleteProxyHost(id: number): Promise<void> {
    this.requireAuth();
    await this.axios.delete(`/nginx/proxy-hosts/${id}`);
  }

  async enableProxyHost(id: number): Promise<void> {
    this.requireAuth();
    await this.axios.post(`/nginx/proxy-hosts/${id}/enable`);
  }

  async disableProxyHost(id: number): Promise<void> {
    this.requireAuth();
    await this.axios.post(`/nginx/proxy-hosts/${id}/disable`);
  }

  // Certificates
  async listCertificates(expand?: string): Promise<any[]> {
    this.requireAuth();
    const params = expand ? { expand } : {};
    const response = await this.axios.get('/nginx/certificates', { params });
    return response.data;
  }

  async createCertificate(data: any): Promise<any> {
    this.requireAuth();
    const response = await this.axios.post('/nginx/certificates', data);
    return response.data;
  }

  async renewCertificate(id: number): Promise<any> {
    this.requireAuth();
    const response = await this.axios.post(`/nginx/certificates/${id}/renew`);
    return response.data;
  }

  async deleteCertificate(id: number): Promise<void> {
    this.requireAuth();
    await this.axios.delete(`/nginx/certificates/${id}`);
  }

  // Access Lists
  async listAccessLists(expand?: string): Promise<any[]> {
    this.requireAuth();
    const params = expand ? { expand } : {};
    const response = await this.axios.get('/nginx/access-lists', { params });
    return response.data;
  }

  async createAccessList(data: any): Promise<any> {
    this.requireAuth();
    const response = await this.axios.post('/nginx/access-lists', data);
    return response.data;
  }

  async updateAccessList(id: number, data: any): Promise<any> {
    this.requireAuth();
    const response = await this.axios.put(`/nginx/access-lists/${id}`, data);
    return response.data;
  }

  async deleteAccessList(id: number): Promise<void> {
    this.requireAuth();
    await this.axios.delete(`/nginx/access-lists/${id}`);
  }

  // Reports
  async getHostsReport(): Promise<any> {
    this.requireAuth();
    const response = await this.axios.get('/reports/hosts');
    return response.data;
  }

  // Redirection Hosts
  async listRedirectionHosts(expand?: string): Promise<any[]> {
    this.requireAuth();
    const params = expand ? { expand } : {};
    const response = await this.axios.get('/nginx/redirection-hosts', { params });
    return response.data;
  }

  async getRedirectionHost(id: number): Promise<any> {
    this.requireAuth();
    const response = await this.axios.get(`/nginx/redirection-hosts/${id}`);
    return response.data;
  }

  async createRedirectionHost(data: any): Promise<any> {
    this.requireAuth();
    const response = await this.axios.post('/nginx/redirection-hosts', data);
    return response.data;
  }

  async updateRedirectionHost(id: number, data: any): Promise<any> {
    this.requireAuth();
    const response = await this.axios.put(`/nginx/redirection-hosts/${id}`, data);
    return response.data;
  }

  async deleteRedirectionHost(id: number): Promise<void> {
    this.requireAuth();
    await this.axios.delete(`/nginx/redirection-hosts/${id}`);
  }

  async enableRedirectionHost(id: number): Promise<void> {
    this.requireAuth();
    await this.axios.post(`/nginx/redirection-hosts/${id}/enable`);
  }

  async disableRedirectionHost(id: number): Promise<void> {
    this.requireAuth();
    await this.axios.post(`/nginx/redirection-hosts/${id}/disable`);
  }

  // Dead Hosts (404 Hosts)
  async listDeadHosts(expand?: string): Promise<any[]> {
    this.requireAuth();
    const params = expand ? { expand } : {};
    const response = await this.axios.get('/nginx/dead-hosts', { params });
    return response.data;
  }

  async getDeadHost(id: number): Promise<any> {
    this.requireAuth();
    const response = await this.axios.get(`/nginx/dead-hosts/${id}`);
    return response.data;
  }

  async createDeadHost(data: any): Promise<any> {
    this.requireAuth();
    const response = await this.axios.post('/nginx/dead-hosts', data);
    return response.data;
  }

  async updateDeadHost(id: number, data: any): Promise<any> {
    this.requireAuth();
    const response = await this.axios.put(`/nginx/dead-hosts/${id}`, data);
    return response.data;
  }

  async deleteDeadHost(id: number): Promise<void> {
    this.requireAuth();
    await this.axios.delete(`/nginx/dead-hosts/${id}`);
  }

  async enableDeadHost(id: number): Promise<void> {
    this.requireAuth();
    await this.axios.post(`/nginx/dead-hosts/${id}/enable`);
  }

  async disableDeadHost(id: number): Promise<void> {
    this.requireAuth();
    await this.axios.post(`/nginx/dead-hosts/${id}/disable`);
  }

  // Audit Log
  async getAuditLog(): Promise<any> {
    this.requireAuth();
    const response = await this.axios.get('/audit-log');
    return response.data;
  }
}

// Global instance for direct access
export const npmClient = NPMDirectClient.getInstance();