// Test setup configuration

// Test environment configuration
export const TEST_CONFIG = {
  NPM_BASE_URL: process.env.NPM_BASE_URL || 'http://localhost:8181/api',
  TEST_EMAIL: process.env.TEST_EMAIL || 'test@example.com',
  TEST_PASSWORD: process.env.TEST_PASSWORD || 'test123456',
  TEST_TIMEOUT: 30000,
};

console.log('🧪 Test setup loaded');
console.log(`📡 NPM Base URL: ${TEST_CONFIG.NPM_BASE_URL}`);

// Helper function to check if NPM is available
export async function waitForNPM(): Promise<void> {
  console.log('🔍 Checking NPM availability...');
  
  const maxRetries = 30;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const response = await fetch(`${TEST_CONFIG.NPM_BASE_URL.replace('/api', '')}/api/schema`);
      if (response.ok) {
        console.log('✅ NPM is ready for testing');
        return;
      }
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        throw new Error(`NPM not ready after ${maxRetries} attempts`);
      }
      console.log(`⏳ Waiting for NPM... (${retries}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}