# next-runtime-env

> Runtime environment variable resolution for Next.js standalone/Docker deployments

[![npm version](https://badge.fury.io/js/next-runtime-env.svg)](https://www.npmjs.com/package/next-runtime-env)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## The Problem

When Next.js builds in standalone mode (used for Docker deployments), environment variables like `NEXTAUTH_URL` are **baked in at build time**. This means:

- ❌ You need separate Docker images for dev, staging, and production
- ❌ You can't use the same image across environments
- ❌ OAuth callbacks fail when URLs don't match
- ❌ You have to rebuild for every environment change

## The Solution

`next-runtime-env` patches environment variables **at runtime** when your container starts, allowing:

- ✅ One Docker image for all environments
- ✅ Runtime configuration via `APP_ENV`
- ✅ Proper OAuth redirects in every environment
- ✅ Build once, deploy everywhere

## Installation

```bash
npm install next-runtime-env
# or
yarn add next-runtime-env
# or
pnpm add next-runtime-env
```

## Quick Start

### 1. Simple Usage (Recommended)

Replace your Next.js standalone server with our runtime-aware server:

```dockerfile
# In your Dockerfile
FROM node:20-alpine

# ... your build steps ...

# Copy the runtime server
COPY --from=builder /app/node_modules/next-runtime-env/server.js ./server.js

# Use our server instead of Next.js standalone server
CMD ["node", "server.js"]
```

Set your environment:

```bash
# Development
docker run -e APP_ENV=development your-image

# Production
docker run -e APP_ENV=production your-image

# Staging
docker run -e APP_ENV=staging your-image
```

### 2. Custom Configuration

Create `runtime-env.config.js` in your project root:

```javascript
module.exports = {
  environments: {
    production: {
      vars: {
        NEXTAUTH_URL: 'https://app.example.com',
        NEXT_PUBLIC_API_URL: 'https://api.example.com'
      }
    },
    development: {
      vars: {
        NEXTAUTH_URL: 'https://dev.example.com',
        NEXT_PUBLIC_API_URL: 'https://api-dev.example.com'
      }
    },
    staging: {
      vars: {
        NEXTAUTH_URL: 'https://staging.example.com',
        NEXT_PUBLIC_API_URL: 'https://api-staging.example.com'
      }
    }
  },
  // Variables that can be overridden at runtime
  variables: ['NEXTAUTH_URL', 'NEXT_PUBLIC_API_URL', 'DATABASE_URL'],
  
  // The env var that determines which environment to use
  envSelector: 'APP_ENV', // or 'NODE_ENV', 'ENVIRONMENT', etc.
  
  // Enable debug logging
  debug: true
};
```

### 3. NextAuth Integration

Your NextAuth configuration works seamlessly:

```javascript
// app/api/auth/[...nextauth]/route.js
import NextAuth from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';

const handler = NextAuth({
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
    }),
  ],
  // NEXTAUTH_URL is now set correctly at runtime!
});

export { handler as GET, handler as POST };
```

## Advanced Usage

### Programmatic API

```javascript
import { patchProcessEnv } from 'next-runtime-env';

// In your custom server
patchProcessEnv({
  environments: {
    production: {
      vars: { NEXTAUTH_URL: 'https://app.example.com' }
    },
    development: {
      vars: { NEXTAUTH_URL: 'https://dev.example.com' }
    }
  },
  variables: ['NEXTAUTH_URL'],
  debug: true
});

// Then start Next.js
const app = next({ /* ... */ });
```

### Next.js Config Wrapper

```javascript
// next.config.js
const { withRuntimeEnv } = require('next-runtime-env');

const nextConfig = {
  // your config
};

module.exports = withRuntimeEnv(nextConfig, {
  environments: { /* ... */ },
  variables: ['NEXTAUTH_URL', 'NEXT_PUBLIC_API_URL']
});
```

### Runtime Overrides

Override any variable at runtime with the `RUNTIME_` prefix:

```bash
# Override NEXTAUTH_URL regardless of APP_ENV
docker run \
  -e APP_ENV=production \
  -e RUNTIME_NEXTAUTH_URL=https://custom.example.com \
  your-image
```

## Environment Variable Priority

1. `RUNTIME_*` prefixed variables (highest priority)
2. Environment-specific configuration based on `APP_ENV`
3. Existing environment variables
4. Defaults

## Docker Example

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build Next.js
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install next-runtime-env
RUN npm install next-runtime-env

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy runtime config (optional)
COPY runtime-env.config.js ./

# Use runtime-aware server
CMD ["npx", "next-runtime-env/server"]
```

## Kubernetes Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nextjs-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: your-image:latest
        env:
        - name: APP_ENV
          value: "development"  # or "production", "staging"
        - name: NODE_ENV
          value: "production"   # Always production for Next.js
        # Secrets still work normally
        - name: AZURE_AD_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: client-secret
```

## How It Works

1. **Build Time**: Next.js builds with default/production values
2. **Container Start**: Our server runs before Next.js
3. **Runtime Patch**: Environment variables are updated based on `APP_ENV`
4. **Next.js Start**: Next.js starts with the correct runtime values

## Common Use Cases

### Multi-tenant SaaS
```javascript
{
  environments: {
    'customer-a': {
      vars: {
        NEXTAUTH_URL: 'https://a.example.com',
        TENANT_ID: 'customer-a'
      }
    },
    'customer-b': {
      vars: {
        NEXTAUTH_URL: 'https://b.example.com',
        TENANT_ID: 'customer-b'
      }
    }
  }
}
```

### Feature Flags
```javascript
{
  environments: {
    'production': {
      vars: {
        FEATURE_NEW_UI: 'false'
      }
    },
    'canary': {
      vars: {
        FEATURE_NEW_UI: 'true'
      }
    }
  }
}
```

### Regional Deployments
```javascript
{
  environments: {
    'us-east': {
      vars: {
        API_ENDPOINT: 'https://us-east.api.example.com',
        REGION: 'us-east-1'
      }
    },
    'eu-west': {
      vars: {
        API_ENDPOINT: 'https://eu-west.api.example.com',
        REGION: 'eu-west-1'
      }
    }
  }
}
```

## Debugging

Enable debug mode to see what's happening:

```bash
docker run -e DEBUG=true -e APP_ENV=development your-image
```

Output:
```
[next-runtime-env] Starting server with environment: development
[next-runtime-env] Setting NEXTAUTH_URL=https://dev.example.com (was: https://prod.example.com)
[next-runtime-env] Server ready on http://0.0.0.0:3000
[next-runtime-env] NextAuth URL: https://dev.example.com
[next-runtime-env] Environment: development
```

## Migration Guide

### From Multiple Dockerfiles

Before:
```dockerfile
# Dockerfile.dev
ENV NEXTAUTH_URL=https://dev.example.com
# ... build ...

# Dockerfile.prod
ENV NEXTAUTH_URL=https://prod.example.com
# ... build ...
```

After:
```dockerfile
# Single Dockerfile
# No environment-specific variables!
# ... build ...
CMD ["npx", "next-runtime-env/server"]
```

### From Build Arguments

Before:
```bash
docker build --build-arg NEXTAUTH_URL=https://dev.example.com -t app:dev .
docker build --build-arg NEXTAUTH_URL=https://prod.example.com -t app:prod .
```

After:
```bash
docker build -t app:latest .
docker run -e APP_ENV=development app:latest
docker run -e APP_ENV=production app:latest
```

## FAQ

### Does this work with Vercel/Netlify?
No, this is specifically for self-hosted Next.js deployments using standalone output mode.

### Does it work with all environment variables?
It works with any environment variable. However, `NEXT_PUBLIC_*` variables that are inlined during build may still need rebuilding for changes.

### Is there a performance impact?
Minimal. Environment resolution happens once at server startup, not per request.

### Can I use this with PM2/cluster mode?
Yes, the environment is patched before Next.js starts, so it works with any process manager.

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## License

MIT © [Vinnie Espo](https://github.com/vespo92)

## Related Projects

- [next-bun-docker](https://github.com/vespo92/next-bun-docker) - Webpack fixes for Bun + Docker + Next.js

## Support

If this package helps you, please consider:
- ⭐ Starring the repo
- 🐛 Reporting issues
- 🔀 Contributing improvements
- 📢 Sharing with others who might need it