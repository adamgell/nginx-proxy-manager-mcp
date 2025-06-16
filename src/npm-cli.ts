#!/usr/bin/env node
/**
 * NPM CLI - Direct command-line interface for Nginx Proxy Manager
 * Usage: npm-cli <command> [options]
 */

import { npmClient } from './direct-client.js';
import { program } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_FILE = join(homedir(), '.npm-cli-config.json');

interface Config {
  baseUrl?: string;
  credentials?: {
    identity: string;
    secret: string;
  };
}

function loadConfig(): Config {
  if (existsSync(CONFIG_FILE)) {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  }
  return {};
}

function saveConfig(config: Config) {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Configure CLI
program
  .name('npm-cli')
  .description('CLI for Nginx Proxy Manager')
  .version('1.0.0');

// Config command
program
  .command('config')
  .description('Configure NPM connection')
  .option('-u, --url <url>', 'NPM API URL')
  .option('-e, --email <email>', 'Login email')
  .option('-p, --password <password>', 'Login password')
  .action((options) => {
    const config = loadConfig();
    if (options.url) config.baseUrl = options.url;
    if (options.email && options.password) {
      config.credentials = {
        identity: options.email,
        secret: options.password
      };
    }
    saveConfig(config);
    console.log('Configuration saved');
  });

// Auth command
program
  .command('auth')
  .description('Authenticate with NPM')
  .option('-e, --email <email>', 'Login email')
  .option('-p, --password <password>', 'Login password')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const email = options.email || config.credentials?.identity;
      const password = options.password || config.credentials?.secret;
      
      if (!email || !password) {
        console.error('Email and password required');
        process.exit(1);
      }
      
      const result = await npmClient.authenticate(email, password);
      console.log(result);
    } catch (error: any) {
      console.error('Authentication failed:', error.message);
      process.exit(1);
    }
  });

// Auth status command
program
  .command('auth-status')
  .description('Check authentication status')
  .action(() => {
    const status = npmClient.getAuthStatus();
    console.log(JSON.stringify(status, null, 2));
  });

// Proxy hosts commands
const proxy = program
  .command('proxy')
  .description('Manage proxy hosts');

proxy
  .command('list')
  .description('List all proxy hosts')
  .option('--expand <fields>', 'Expand fields (owner,certificate,access_list)')
  .action(async (options) => {
    try {
      const hosts = await npmClient.listProxyHosts(options.expand);
      console.log(JSON.stringify(hosts, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

proxy
  .command('get <id>')
  .description('Get a specific proxy host')
  .action(async (id) => {
    try {
      const host = await npmClient.getProxyHost(parseInt(id));
      console.log(JSON.stringify(host, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

proxy
  .command('create')
  .description('Create a new proxy host')
  .option('-d, --domain <domains...>', 'Domain names')
  .option('-h, --host <host>', 'Forward host')
  .option('-p, --port <port>', 'Forward port', '80')
  .option('-s, --scheme <scheme>', 'Forward scheme (http/https)', 'http')
  .option('--ssl', 'Enable SSL')
  .option('--hsts', 'Enable HSTS')
  .option('--http2', 'Enable HTTP/2')
  .option('--block-exploits', 'Block exploits')
  .action(async (options) => {
    try {
      if (!options.domain || !options.host) {
        console.error('Domain and host are required');
        process.exit(1);
      }
      
      const data = {
        domain_names: options.domain,
        forward_scheme: options.scheme,
        forward_host: options.host,
        forward_port: parseInt(options.port),
        ssl_forced: options.ssl || false,
        hsts_enabled: options.hsts || false,
        http2_support: options.http2 || false,
        block_exploits: options.blockExploits || false,
        caching_enabled: false,
        allow_websocket_upgrade: true,
        enabled: true
      };
      
      const result = await npmClient.createProxyHost(data);
      console.log('Proxy host created:', result.id);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

proxy
  .command('delete <id>')
  .description('Delete a proxy host')
  .action(async (id) => {
    try {
      await npmClient.deleteProxyHost(parseInt(id));
      console.log('Proxy host deleted');
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

proxy
  .command('enable <id>')
  .description('Enable a proxy host')
  .action(async (id) => {
    try {
      await npmClient.enableProxyHost(parseInt(id));
      console.log('Proxy host enabled');
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

proxy
  .command('disable <id>')
  .description('Disable a proxy host')
  .action(async (id) => {
    try {
      await npmClient.disableProxyHost(parseInt(id));
      console.log('Proxy host disabled');
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Certificate commands
const cert = program
  .command('cert')
  .description('Manage certificates');

cert
  .command('list')
  .description('List all certificates')
  .option('--expand <fields>', 'Expand fields (owner)')
  .action(async (options) => {
    try {
      const certs = await npmClient.listCertificates(options.expand);
      console.log(JSON.stringify(certs, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

cert
  .command('renew <id>')
  .description('Renew a certificate')
  .action(async (id) => {
    try {
      const result = await npmClient.renewCertificate(parseInt(id));
      console.log('Certificate renewed');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

cert
  .command('delete <id>')
  .description('Delete a certificate')
  .action(async (id) => {
    try {
      await npmClient.deleteCertificate(parseInt(id));
      console.log('Certificate deleted');
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Access list commands
const access = program
  .command('access')
  .description('Manage access lists');

access
  .command('list')
  .description('List all access lists')
  .option('--expand <fields>', 'Expand fields (owner,items,clients,proxy_hosts)')
  .action(async (options) => {
    try {
      const lists = await npmClient.listAccessLists(options.expand);
      console.log(JSON.stringify(lists, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Reports command
program
  .command('report')
  .description('Get hosts report')
  .action(async () => {
    try {
      const report = await npmClient.getHostsReport();
      console.log(JSON.stringify(report, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Audit log command
program
  .command('audit')
  .description('Get audit log')
  .action(async () => {
    try {
      const log = await npmClient.getAuditLog();
      console.log(JSON.stringify(log, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Initialize client with config
const config = loadConfig();
if (config.baseUrl) {
  process.env.NPM_BASE_URL = config.baseUrl;
}

// Auto-authenticate if credentials are saved
if (config.credentials && process.argv[2] !== 'config') {
  npmClient.authenticate(config.credentials.identity, config.credentials.secret)
    .then(() => {
      program.parse(process.argv);
    })
    .catch((error) => {
      console.error('Auto-authentication failed:', error.message);
      program.parse(process.argv);
    });
} else {
  program.parse(process.argv);
}