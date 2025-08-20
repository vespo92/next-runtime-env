#!/usr/bin/env node

/**
 * Test script to demonstrate runtime environment resolution
 * 
 * Run with different APP_ENV values:
 *   APP_ENV=production node examples/test-runtime.js
 *   APP_ENV=development node examples/test-runtime.js
 *   APP_ENV=staging node examples/test-runtime.js
 */

// Load the package
const { patchProcessEnv, resolveRuntimeEnv, getCurrentEnvironment } = require('../src');

// Load example config
const config = require('./runtime-env.config');

console.log('=================================');
console.log('Next.js Runtime Environment Test');
console.log('=================================\n');

// Show current state
console.log('Current Environment Variables:');
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`  APP_ENV: ${process.env.APP_ENV || 'not set'}`);
console.log(`  NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'not set'}`);
console.log(`  RUNTIME_NEXTAUTH_URL: ${process.env.RUNTIME_NEXTAUTH_URL || 'not set'}\n`);

// Detect environment
const currentEnv = getCurrentEnvironment('APP_ENV');
console.log(`Detected Environment: ${currentEnv}\n`);

// Show what will be resolved (without patching)
console.log('Resolved Values (preview):');
const resolved = resolveRuntimeEnv(config);
console.log(`  NEXTAUTH_URL: ${resolved.NEXTAUTH_URL}`);
console.log(`  NEXT_PUBLIC_API_URL: ${resolved.NEXT_PUBLIC_API_URL}`);
console.log(`  NEXT_PUBLIC_APP_NAME: ${resolved.NEXT_PUBLIC_APP_NAME}\n`);

// Apply the patch
console.log('Patching process.env...');
patchProcessEnv(config);

// Show final state
console.log('\nFinal Environment Variables:');
console.log(`  NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`);
console.log(`  NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL}`);
console.log(`  NEXT_PUBLIC_APP_NAME: ${process.env.NEXT_PUBLIC_APP_NAME}`);
console.log(`  NEXT_PUBLIC_ENVIRONMENT: ${process.env.NEXT_PUBLIC_ENVIRONMENT}\n`);

// Test validation
console.log('Running validation...');
try {
  if (config.validate) {
    config.validate(process.env);
    console.log('✅ Validation passed!\n');
  }
} catch (error) {
  console.error('❌ Validation failed:', error.message, '\n');
}

// Demonstrate runtime override
if (process.env.RUNTIME_NEXTAUTH_URL) {
  console.log('Runtime Override Detected:');
  console.log(`  RUNTIME_NEXTAUTH_URL overrides the environment-specific value`);
  console.log(`  Final NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}\n`);
}

// Show how this would work in different scenarios
console.log('=================================');
console.log('Usage Examples:');
console.log('=================================\n');

console.log('1. Development Environment:');
console.log('   APP_ENV=development node server.js\n');

console.log('2. Production Environment:');
console.log('   APP_ENV=production node server.js\n');

console.log('3. With Runtime Override:');
console.log('   APP_ENV=production RUNTIME_NEXTAUTH_URL=https://custom.example.com node server.js\n');

console.log('4. In Docker:');
console.log('   docker run -e APP_ENV=development your-image\n');

console.log('5. In Kubernetes:');
console.log('   kubectl set env deployment/app APP_ENV=staging\n');