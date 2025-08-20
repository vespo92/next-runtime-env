/**
 * Example runtime environment configuration
 * 
 * Place this file in your project root and customize for your needs
 */

module.exports = {
  // Define your environments and their specific variables
  environments: {
    production: {
      vars: {
        NEXTAUTH_URL: 'https://app.example.com',
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
        NEXT_PUBLIC_APP_NAME: 'My App',
        NEXT_PUBLIC_ENVIRONMENT: 'production'
      },
      description: 'Production environment'
    },
    development: {
      vars: {
        NEXTAUTH_URL: 'https://dev.example.com',
        NEXT_PUBLIC_API_URL: 'https://api-dev.example.com',
        NEXT_PUBLIC_APP_NAME: 'My App (Dev)',
        NEXT_PUBLIC_ENVIRONMENT: 'development'
      },
      description: 'Development environment'
    },
    staging: {
      vars: {
        NEXTAUTH_URL: 'https://staging.example.com',
        NEXT_PUBLIC_API_URL: 'https://api-staging.example.com',
        NEXT_PUBLIC_APP_NAME: 'My App (Staging)',
        NEXT_PUBLIC_ENVIRONMENT: 'staging'
      },
      description: 'Staging environment'
    },
    local: {
      vars: {
        NEXTAUTH_URL: 'http://localhost:3000',
        NEXT_PUBLIC_API_URL: 'http://localhost:8000',
        NEXT_PUBLIC_APP_NAME: 'My App (Local)',
        NEXT_PUBLIC_ENVIRONMENT: 'local'
      },
      description: 'Local development'
    }
  },

  // List of variables that can be overridden with RUNTIME_ prefix
  variables: [
    'NEXTAUTH_URL',
    'NEXTAUTH_URL_INTERNAL',
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_APP_NAME',
    'NEXT_PUBLIC_ENVIRONMENT',
    'DATABASE_URL',
    'REDIS_URL'
  ],

  // The environment variable that determines which environment to use
  envSelector: 'APP_ENV',

  // Enable debug logging
  debug: process.env.DEBUG === 'true',

  // Optional validation function
  validate: (env) => {
    // Check required variables
    const required = ['NEXTAUTH_URL'];
    const missing = required.filter(key => !env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate URLs
    if (env.NEXTAUTH_URL && !env.NEXTAUTH_URL.startsWith('http')) {
      throw new Error('NEXTAUTH_URL must be a valid URL');
    }
  }
};