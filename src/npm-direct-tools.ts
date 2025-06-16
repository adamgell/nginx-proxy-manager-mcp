#!/usr/bin/env node
/**
 * Direct NPM Tools for Claude Code
 * This provides a simplified interface that can be called directly
 */

import axios from 'axios';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const SESSION_FILE = join(tmpdir(), '.npm-session.json');

interface Session {
  token: string;
  expiresAt: string;
  baseUrl: string;
}

class NPMDirectTools {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = process.env.NPM_BASE_URL || 'http://localhost:81/api';
    this.loadSession();
  }

  private loadSession() {
    if (existsSync(SESSION_FILE)) {
      try {
        const session: Session = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
        if (new Date(session.expiresAt) > new Date() && session.baseUrl === this.baseUrl) {
          this.token = session.token;
        }
      } catch (e) {
        // Invalid session file
      }
    }
  }

  private saveSession(token: string) {
    const session: Session = {
      token,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      baseUrl: this.baseUrl
    };
    writeFileSync(SESSION_FILE, JSON.stringify(session));
  }

  async request(method: string, path: string, data?: any) {
    const headers: any = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${path}`,
        data,
        headers,
        timeout: 30000
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Authentication required or token expired');
      }
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  // Tools
  async authenticate(identity: string, secret: string) {
    const response = await this.request('POST', '/tokens', { identity, secret });
    this.token = response.token;
    this.saveSession(response.token);
    return `Authenticated successfully. Session saved.`;
  }

  async authStatus() {
    if (!this.token) {
      return { authenticated: false };
    }
    try {
      // Test auth by making a simple request
      await this.request('GET', '/reports/hosts');
      return { authenticated: true, baseUrl: this.baseUrl };
    } catch (error) {
      this.token = null;
      return { authenticated: false };
    }
  }

  async listProxyHosts(expand?: string) {
    const params = expand ? `?expand=${expand}` : '';
    return await this.request('GET', `/nginx/proxy-hosts${params}`);
  }

  async getProxyHost(id: number) {
    return await this.request('GET', `/nginx/proxy-hosts/${id}`);
  }

  async createProxyHost(data: any) {
    return await this.request('POST', '/nginx/proxy-hosts', data);
  }

  async updateProxyHost(id: number, data: any) {
    return await this.request('PUT', `/nginx/proxy-hosts/${id}`, data);
  }

  async deleteProxyHost(id: number) {
    await this.request('DELETE', `/nginx/proxy-hosts/${id}`);
    return 'Proxy host deleted successfully';
  }

  async enableProxyHost(id: number) {
    await this.request('POST', `/nginx/proxy-hosts/${id}/enable`);
    return 'Proxy host enabled successfully';
  }

  async disableProxyHost(id: number) {
    await this.request('POST', `/nginx/proxy-hosts/${id}/disable`);
    return 'Proxy host disabled successfully';
  }

  async listCertificates(expand?: string) {
    const params = expand ? `?expand=${expand}` : '';
    return await this.request('GET', `/nginx/certificates${params}`);
  }

  async createCertificate(data: any) {
    return await this.request('POST', '/nginx/certificates', data);
  }

  async renewCertificate(id: number) {
    return await this.request('POST', `/nginx/certificates/${id}/renew`);
  }

  async deleteCertificate(id: number) {
    await this.request('DELETE', `/nginx/certificates/${id}`);
    return 'Certificate deleted successfully';
  }

  async listAccessLists(expand?: string) {
    const params = expand ? `?expand=${expand}` : '';
    return await this.request('GET', `/nginx/access-lists${params}`);
  }

  async createAccessList(data: any) {
    return await this.request('POST', '/nginx/access-lists', data);
  }

  async updateAccessList(id: number, data: any) {
    return await this.request('PUT', `/nginx/access-lists/${id}`, data);
  }

  async deleteAccessList(id: number) {
    await this.request('DELETE', `/nginx/access-lists/${id}`);
    return 'Access list deleted successfully';
  }

  async getHostsReport() {
    return await this.request('GET', '/reports/hosts');
  }

  async getAuditLog() {
    return await this.request('GET', '/audit-log');
  }
}

// CLI interface
const tools = new NPMDirectTools();
const [,, command, ...args] = process.argv;

async function run() {
  try {
    let result;
    
    switch (command) {
      case 'authenticate':
        if (args.length < 2) throw new Error('Usage: authenticate <email> <password>');
        result = await tools.authenticate(args[0], args[1]);
        break;
        
      case 'auth-status':
        result = await tools.authStatus();
        break;
        
      case 'list-proxy-hosts':
        result = await tools.listProxyHosts(args[0]);
        break;
        
      case 'get-proxy-host':
        if (!args[0]) throw new Error('Usage: get-proxy-host <id>');
        result = await tools.getProxyHost(parseInt(args[0]));
        break;
        
      case 'create-proxy-host':
        if (!args[0]) throw new Error('Usage: create-proxy-host <json-data>');
        result = await tools.createProxyHost(JSON.parse(args[0]));
        break;
        
      case 'update-proxy-host':
        if (args.length < 2) throw new Error('Usage: update-proxy-host <id> <json-data>');
        result = await tools.updateProxyHost(parseInt(args[0]), JSON.parse(args[1]));
        break;
        
      case 'delete-proxy-host':
        if (!args[0]) throw new Error('Usage: delete-proxy-host <id>');
        result = await tools.deleteProxyHost(parseInt(args[0]));
        break;
        
      case 'enable-proxy-host':
        if (!args[0]) throw new Error('Usage: enable-proxy-host <id>');
        result = await tools.enableProxyHost(parseInt(args[0]));
        break;
        
      case 'disable-proxy-host':
        if (!args[0]) throw new Error('Usage: disable-proxy-host <id>');
        result = await tools.disableProxyHost(parseInt(args[0]));
        break;
        
      case 'list-certificates':
        result = await tools.listCertificates(args[0]);
        break;
        
      case 'renew-certificate':
        if (!args[0]) throw new Error('Usage: renew-certificate <id>');
        result = await tools.renewCertificate(parseInt(args[0]));
        break;
        
      case 'delete-certificate':
        if (!args[0]) throw new Error('Usage: delete-certificate <id>');
        result = await tools.deleteCertificate(parseInt(args[0]));
        break;
        
      case 'list-access-lists':
        result = await tools.listAccessLists(args[0]);
        break;
        
      case 'get-hosts-report':
        result = await tools.getHostsReport();
        break;
        
      case 'get-audit-log':
        result = await tools.getAuditLog();
        break;
        
      default:
        throw new Error(`Unknown command: ${command}`);
    }
    
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

if (command) {
  run();
} else {
  console.log('Available commands:');
  console.log('  authenticate <email> <password>');
  console.log('  auth-status');
  console.log('  list-proxy-hosts [expand]');
  console.log('  get-proxy-host <id>');
  console.log('  create-proxy-host <json-data>');
  console.log('  update-proxy-host <id> <json-data>');
  console.log('  delete-proxy-host <id>');
  console.log('  enable-proxy-host <id>');
  console.log('  disable-proxy-host <id>');
  console.log('  list-certificates [expand]');
  console.log('  renew-certificate <id>');
  console.log('  delete-certificate <id>');
  console.log('  list-access-lists [expand]');
  console.log('  get-hosts-report');
  console.log('  get-audit-log');
}