import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { execSync } from 'child_process';
import { existsSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TEST_CONFIG, waitForNPM } from './setup';

const SESSION_FILE = join(tmpdir(), '.npm-session.json');

describe('NPM Direct Tools CLI', () => {
  const npmDirectToolsPath = join(__dirname, '..', 'dist', 'npm-direct-tools.js');
  const baseUrl = TEST_CONFIG.NPM_BASE_URL;
  
  // Helper function to run CLI commands
  const runCommand = (args: string): any => {
    try {
      const output = execSync(
        `NPM_BASE_URL=${baseUrl} node ${npmDirectToolsPath} ${args}`,
        { encoding: 'utf-8' }
      );
      return JSON.parse(output);
    } catch (error: any) {
      if (error.stdout) {
        try {
          return JSON.parse(error.stdout);
        } catch {
          throw error;
        }
      }
      throw error;
    }
  };

  beforeAll(async () => {
    // Wait for NPM to be available
    await waitForNPM();
    
    // Clean up any existing session file
    if (existsSync(SESSION_FILE)) {
      rmSync(SESSION_FILE);
    }
  }, 120000);

  afterAll(() => {
    // Clean up session file after tests
    if (existsSync(SESSION_FILE)) {
      rmSync(SESSION_FILE);
    }
  });

  describe('Authentication', () => {
    test('should authenticate successfully', () => {
      const result = runCommand(`authenticate ${TEST_CONFIG.TEST_EMAIL} ${TEST_CONFIG.TEST_PASSWORD}`);
      expect(result).toBe('Authenticated successfully. Session saved.');
      
      // Verify session file was created
      expect(existsSync(SESSION_FILE)).toBe(true);
      
      // Verify session file contents
      const session = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
      expect(session).toHaveProperty('token');
      expect(session).toHaveProperty('expiresAt');
      expect(session).toHaveProperty('baseUrl', baseUrl);
    });

    test('should show authenticated status', () => {
      const result = runCommand('auth-status');
      expect(result).toHaveProperty('authenticated', true);
      expect(result).toHaveProperty('baseUrl', baseUrl);
    });

    test('should fail with invalid credentials', () => {
      // Clean session first
      if (existsSync(SESSION_FILE)) {
        rmSync(SESSION_FILE);
      }
      
      expect(() => {
        runCommand('authenticate invalid@example.com wrongpassword');
      }).toThrow();
    });
  });

  describe('Proxy Hosts', () => {
    let createdProxyHostId: number;

    test('should list proxy hosts', () => {
      const result = runCommand('list-proxy-hosts');
      expect(Array.isArray(result)).toBe(true);
    });

    test('should create a proxy host', () => {
      const proxyHostData = {
        domain_names: ['cli-test.example.com'],
        forward_scheme: 'http',
        forward_host: '192.168.1.50',
        forward_port: 8080,
        enabled: true
      };
      
      const result = runCommand(`create-proxy-host '${JSON.stringify(proxyHostData)}'`);
      expect(result).toHaveProperty('id');
      expect(result.domain_names).toEqual(['cli-test.example.com']);
      
      createdProxyHostId = result.id;
    });

    test('should get a specific proxy host', () => {
      const result = runCommand(`get-proxy-host ${createdProxyHostId}`);
      expect(result).toHaveProperty('id', createdProxyHostId);
      expect(result.domain_names).toEqual(['cli-test.example.com']);
    });

    test('should update a proxy host', () => {
      const updateData = {
        forward_port: 9090
      };
      
      const result = runCommand(`update-proxy-host ${createdProxyHostId} '${JSON.stringify(updateData)}'`);
      expect(result.forward_port).toBe(9090);
    });

    test('should disable a proxy host', () => {
      const result = runCommand(`disable-proxy-host ${createdProxyHostId}`);
      expect(result).toBe('Proxy host disabled successfully');
    });

    test('should enable a proxy host', () => {
      const result = runCommand(`enable-proxy-host ${createdProxyHostId}`);
      expect(result).toBe('Proxy host enabled successfully');
    });

    test('should delete a proxy host', () => {
      const result = runCommand(`delete-proxy-host ${createdProxyHostId}`);
      expect(result).toBe('Proxy host deleted successfully');
    });
  });

  describe('Certificates', () => {
    test('should list certificates', () => {
      const result = runCommand('list-certificates');
      expect(Array.isArray(result)).toBe(true);
    });

    // Note: We can't test certificate creation/renewal in automated tests
    // as they require domain validation
  });

  describe('Access Lists', () => {
    let createdAccessListId: number;

    test('should list access lists', () => {
      const result = runCommand('list-access-lists');
      expect(Array.isArray(result)).toBe(true);
    });

    test('should create an access list', () => {
      const accessListData = {
        name: 'CLI Test Access List',
        satisfy_any: false,
        pass_auth: true,
        items: [
          {
            username: 'cliuser',
            password: 'clipass123'
          }
        ]
      };
      
      const result = runCommand(`create-access-list '${JSON.stringify(accessListData)}'`);
      expect(result).toHaveProperty('id');
      expect(result.name).toBe('CLI Test Access List');
      
      createdAccessListId = result.id;
    });

    test('should update an access list', () => {
      const updateData = {
        name: 'Updated CLI Test Access List'
      };
      
      const result = runCommand(`update-access-list ${createdAccessListId} '${JSON.stringify(updateData)}'`);
      expect(result.name).toBe('Updated CLI Test Access List');
    });

    test('should delete an access list', () => {
      const result = runCommand(`delete-access-list ${createdAccessListId}`);
      expect(result).toBe('Access list deleted successfully');
    });
  });

  describe('Reports and Audit', () => {
    test('should get hosts report', () => {
      const result = runCommand('get-hosts-report');
      expect(result).toHaveProperty('proxy');
      expect(result).toHaveProperty('redirection');
      expect(result).toHaveProperty('dead');
      expect(typeof result.proxy).toBe('number');
    });

    test('should get audit log', () => {
      const result = runCommand('get-audit-log');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown commands', () => {
      expect(() => {
        runCommand('unknown-command');
      }).toThrow();
    });

    test('should handle missing required arguments', () => {
      expect(() => {
        runCommand('get-proxy-host');
      }).toThrow();
    });

    test('should handle invalid JSON data', () => {
      expect(() => {
        runCommand('create-proxy-host "invalid-json"');
      }).toThrow();
    });

    test('should handle unauthenticated requests', () => {
      // Remove session file to simulate unauthenticated state
      if (existsSync(SESSION_FILE)) {
        rmSync(SESSION_FILE);
      }
      
      expect(() => {
        runCommand('list-proxy-hosts');
      }).toThrow();
    });
  });

  describe('Session Management', () => {
    test('should persist session across commands', () => {
      // Authenticate
      runCommand(`authenticate ${TEST_CONFIG.TEST_EMAIL} ${TEST_CONFIG.TEST_PASSWORD}`);
      
      // Verify session file exists
      expect(existsSync(SESSION_FILE)).toBe(true);
      
      // Run another command that requires auth
      const result = runCommand('list-proxy-hosts');
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle expired sessions', () => {
      // Create an expired session
      const expiredSession = {
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 3600000).toISOString(),
        baseUrl: baseUrl
      };
      
      require('fs').writeFileSync(SESSION_FILE, JSON.stringify(expiredSession));
      
      // Try to use the expired session
      expect(() => {
        runCommand('list-proxy-hosts');
      }).toThrow();
    });
  });

  describe('Help Output', () => {
    test('should show help when no command is provided', () => {
      try {
        execSync(`NPM_BASE_URL=${baseUrl} node ${npmDirectToolsPath}`, { encoding: 'utf-8' });
      } catch (error: any) {
        // Help output goes to stdout, not stderr
        const output = error.stdout || error.stderr || '';
        expect(output).toContain('Available commands:');
        expect(output).toContain('authenticate <email> <password>');
        expect(output).toContain('list-proxy-hosts');
        expect(output).toContain('get-audit-log');
      }
    });
  });
});