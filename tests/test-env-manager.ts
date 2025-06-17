import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export class TestEnvironmentManager {
  private projectRoot: string;
  private logsDir: string;
  private reportsDir: string;

  constructor() {
    this.projectRoot = join(__dirname, '..');
    this.logsDir = join(this.projectRoot, 'test-logs');
    this.reportsDir = join(this.projectRoot, 'test-reports');
    
    // Create directories if they don't exist
    if (!existsSync(this.logsDir)) mkdirSync(this.logsDir, { recursive: true });
    if (!existsSync(this.reportsDir)) mkdirSync(this.reportsDir, { recursive: true });
  }

  /**
   * Start the test environment
   */
  async startEnvironment(configFile: string = 'docker-compose.full-test.yml'): Promise<void> {
    console.log('🚀 Starting test environment...');
    
    try {
      // Stop any existing containers
      this.stopEnvironment(configFile);
      
      // Stop any containers using our test ports
      console.log('🔍 Checking for port conflicts...');
      const testPorts = ['9181', '8181'];
      for (const port of testPorts) {
        try {
          const result = execSync(`docker ps -q --filter "publish=${port}"`, { encoding: 'utf-8' }).trim();
          if (result) {
            console.log(`  Stopping containers using port ${port}...`);
            execSync(`docker stop ${result}`, { stdio: 'ignore' });
          }
        } catch (e) {
          // Ignore errors
        }
      }
      
      // Start fresh containers
      execSync(`docker-compose -f ${configFile} up -d`, {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
      
      console.log('⏳ Waiting for services to be healthy...');
      await this.waitForServices();
      
      console.log('✅ Test environment is ready!');
    } catch (error) {
      console.error('❌ Failed to start test environment:', error);
      throw error;
    }
  }

  /**
   * Stop the test environment
   */
  stopEnvironment(configFile: string = 'docker-compose.full-test.yml'): void {
    console.log('🛑 Stopping test environment...');
    
    try {
      execSync(`docker-compose -f ${configFile} down -v`, {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
      console.log('✅ Test environment stopped');
    } catch (error) {
      console.warn('⚠️  Failed to stop test environment:', error);
    }
  }

  /**
   * Wait for all services to be healthy
   */
  private async waitForServices(): Promise<void> {
    const maxAttempts = 60; // 5 minutes
    const checkInterval = 5000; // 5 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Check database
        const dbHealth = execSync(
          'docker exec npm-test-db mariadb-admin ping -h localhost -u root -pnpm_test_root_password',
          { encoding: 'utf-8' }
        );
        
        // Check NPM API
        const npmHealth = execSync(
          'curl -s -o /dev/null -w "%{http_code}" http://localhost:9181/api',
          { encoding: 'utf-8' }
        );
        
        if (dbHealth.includes('is alive') && npmHealth === '200') {
          console.log('✅ All services are healthy');
          return;
        }
      } catch (error) {
        // Services not ready yet
      }
      
      console.log(`⏳ Waiting for services... (${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    throw new Error('Services failed to become healthy within timeout');
  }

  /**
   * Collect logs from all containers
   */
  collectLogs(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = join(this.logsDir, `test-logs-${timestamp}.txt`);
    
    console.log('📋 Collecting container logs...');
    
    try {
      const logs = {
        database: execSync('docker logs npm-test-db --tail 100 2>&1', { encoding: 'utf-8' }),
        npm: execSync('docker logs npm-test-app --tail 200 2>&1', { encoding: 'utf-8' }),
      };
      
      const logContent = `
=== Test Environment Logs - ${timestamp} ===

=== Database Logs ===
${logs.database}

=== NPM Application Logs ===
${logs.npm}
`;
      
      writeFileSync(logFile, logContent);
      console.log(`✅ Logs saved to: ${logFile}`);
    } catch (error) {
      console.error('❌ Failed to collect logs:', error);
    }
  }

  /**
   * Generate test report
   */
  generateReport(testResults: any, reportName: string = 'test-report'): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = join(this.reportsDir, `${reportName}-${timestamp}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        npmVersion: '2.11.3',
        testUrl: 'http://localhost:9181/api',
        dockerized: true,
      },
      results: testResults,
      summary: this.calculateSummary(testResults),
    };
    
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`✅ Report saved to: ${reportFile}`);
    
    // Also generate a human-readable summary
    this.printSummary(report.summary);
  }

  /**
   * Calculate test summary statistics
   */
  private calculateSummary(results: any): any {
    const summary = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      successRate: 0,
      categories: {} as any,
    };
    
    // Process test results
    if (results.testResults) {
      results.testResults.forEach((suite: any) => {
        const category = suite.testFilePath.split('/').pop()?.replace('.test.ts', '') || 'unknown';
        
        if (!summary.categories[category]) {
          summary.categories[category] = {
            total: 0,
            passed: 0,
            failed: 0,
          };
        }
        
        summary.totalTests += suite.numTotalTests;
        summary.passedTests += suite.numPassedTests;
        summary.failedTests += suite.numFailingTests;
        
        summary.categories[category].total += suite.numTotalTests;
        summary.categories[category].passed += suite.numPassedTests;
        summary.categories[category].failed += suite.numFailingTests;
      });
    }
    
    summary.successRate = summary.totalTests > 0 
      ? (summary.passedTests / summary.totalTests) * 100 
      : 0;
    
    return summary;
  }

  /**
   * Print human-readable summary
   */
  private printSummary(summary: any): void {
    console.log('\n=== Test Summary ===');
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passedTests} ✅`);
    console.log(`Failed: ${summary.failedTests} ❌`);
    console.log(`Success Rate: ${summary.successRate.toFixed(2)}%`);
    
    console.log('\n=== Category Breakdown ===');
    Object.entries(summary.categories).forEach(([category, stats]: [string, any]) => {
      console.log(`${category}: ${stats.passed}/${stats.total} (${((stats.passed / stats.total) * 100).toFixed(2)}%)`);
    });
  }

  /**
   * Reset test data
   */
  async resetTestData(): Promise<void> {
    console.log('🔄 Resetting test data...');
    
    try {
      // Connect to database and reset
      const resetSql = `
        USE npm_test;
        -- Clear test data while preserving admin user
        DELETE FROM proxy_hosts WHERE domain_names LIKE '%test%' OR domain_names LIKE '%.local%';
        DELETE FROM redirection_hosts WHERE domain_names LIKE '%test%' OR domain_names LIKE '%.local%';
        DELETE FROM dead_hosts WHERE domain_names LIKE '%test%' OR domain_names LIKE '%.local%';
        DELETE FROM access_lists WHERE name LIKE '%Test%';
      `;
      
      execSync(
        `docker exec npm-test-db mysql -u root -pnpm_test_root_password -e "${resetSql}"`,
        { stdio: 'inherit' }
      );
      
      console.log('✅ Test data reset');
    } catch (error) {
      console.error('❌ Failed to reset test data:', error);
    }
  }

  /**
   * Health check for NPM API
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = execSync(
        'curl -s -o /dev/null -w "%{http_code}" http://localhost:9181/api',
        { encoding: 'utf-8' }
      );
      return response === '200';
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const testEnvManager = new TestEnvironmentManager();