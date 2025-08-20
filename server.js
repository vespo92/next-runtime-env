#!/usr/bin/env node

/**
 * next-runtime-env/server
 * 
 * Drop-in replacement for Next.js standalone server with runtime environment resolution.
 * Place this file in your Docker container and use it instead of the default server.js
 * 
 * Usage:
 *   CMD ["node", "server.js"]
 * 
 * Or with a custom config:
 *   CMD ["node", "server.js", "--config", "runtime-env.config.js"]
 */

const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const configIndex = args.indexOf('--config');
const configPath = configIndex !== -1 ? args[configIndex + 1] : null;

// Load configuration
let config = {
  environments: {
    production: {
      vars: {}
    },
    development: {
      vars: {}
    },
    staging: {
      vars: {}
    },
    local: {
      vars: {
        NEXTAUTH_URL: 'http://localhost:3000'
      }
    }
  },
  variables: ['NEXTAUTH_URL', 'NEXT_PUBLIC_API_URL'],
  envSelector: 'APP_ENV',
  debug: process.env.DEBUG === 'true'
};

// Load custom configuration if provided
if (configPath) {
  try {
    const customConfig = require(path.resolve(configPath));
    config = { ...config, ...customConfig };
    console.log(`[next-runtime-env] Loaded configuration from ${configPath}`);
  } catch (error) {
    console.error(`[next-runtime-env] Failed to load configuration from ${configPath}:`, error);
  }
}

// Try to load runtime-env.config.js from current directory
try {
  const localConfig = require(path.resolve('runtime-env.config.js'));
  config = { ...config, ...localConfig };
  if (config.debug) {
    console.log('[next-runtime-env] Loaded runtime-env.config.js');
  }
} catch (error) {
  // Config file is optional
}

// Function to resolve runtime environment
function resolveRuntimeEnv() {
  const currentEnv = process.env[config.envSelector] || process.env.NODE_ENV || 'production';
  
  console.log(`[next-runtime-env] Starting server with environment: ${currentEnv}`);
  
  const envConfig = config.environments[currentEnv];
  
  if (!envConfig) {
    console.warn(`[next-runtime-env] No configuration found for environment: ${currentEnv}`);
    return;
  }

  // Apply environment-specific overrides
  Object.entries(envConfig.vars).forEach(([key, value]) => {
    const runtimeKey = `RUNTIME_${key}`;
    
    if (process.env[runtimeKey]) {
      process.env[key] = process.env[runtimeKey];
      console.log(`[next-runtime-env] Using runtime override: ${key}=${process.env[runtimeKey]}`);
    } else if (value) {
      const oldValue = process.env[key];
      process.env[key] = value;
      console.log(`[next-runtime-env] Setting ${key}=${value} (was: ${oldValue})`);
    }
  });

  // Handle additional runtime-configurable variables
  config.variables.forEach(varName => {
    const runtimeKey = `RUNTIME_${varName}`;
    if (process.env[runtimeKey]) {
      process.env[varName] = process.env[runtimeKey];
      console.log(`[next-runtime-env] Using runtime override: ${varName}=${process.env[runtimeKey]}`);
    }
  });

  // Special handling for NextAuth
  if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL_INTERNAL) {
    process.env.NEXTAUTH_URL_INTERNAL = process.env.NEXTAUTH_URL;
  }
}

// Patch environment before loading Next.js
resolveRuntimeEnv();

// Log final configuration
if (config.debug) {
  console.log('[next-runtime-env] Final environment:', {
    NODE_ENV: process.env.NODE_ENV,
    [config.envSelector]: process.env[config.envSelector],
    ...config.variables.reduce((acc, v) => ({ ...acc, [v]: process.env[v] }), {})
  });
}

// Now load Next.js with the patched environment
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Determine the app directory
let dir = process.cwd();

// In standalone mode, the app might be in a different location
if (fs.existsSync(path.join(dir, '.next', 'standalone'))) {
  // We're in the build directory
} else if (fs.existsSync(path.join(dir, 'apps', 'platform', '.next'))) {
  // Monorepo structure
  dir = path.join(dir, 'apps', 'platform');
} else if (fs.existsSync(path.join(dir, '.next'))) {
  // Standard Next.js app
}

const app = next({
  dev,
  hostname,
  port,
  dir,
  conf: {
    // Pass runtime environment to Next.js
    env: Object.keys(process.env).reduce((acc, key) => {
      if (config.variables.includes(key) || key.startsWith('NEXT_PUBLIC_')) {
        acc[key] = process.env[key];
      }
      return acc;
    }, {})
  }
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      // Log auth requests for debugging
      if (config.debug && parsedUrl.pathname?.startsWith('/api/auth')) {
        console.log(`[next-runtime-env] Auth request: ${req.method} ${parsedUrl.pathname}`);
      }
      
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('[next-runtime-env] Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  }).listen(port, hostname, () => {
    console.log(`[next-runtime-env] Server ready on http://${hostname}:${port}`);
    
    // Log important URLs
    if (process.env.NEXTAUTH_URL) {
      console.log(`[next-runtime-env] NextAuth URL: ${process.env.NEXTAUTH_URL}`);
    }
    if (process.env.NEXT_PUBLIC_API_URL) {
      console.log(`[next-runtime-env] Public API URL: ${process.env.NEXT_PUBLIC_API_URL}`);
    }
    
    console.log(`[next-runtime-env] Environment: ${process.env[config.envSelector] || process.env.NODE_ENV}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[next-runtime-env] SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[next-runtime-env] SIGINT received, shutting down gracefully');
  process.exit(0);
});