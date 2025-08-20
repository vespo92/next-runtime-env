# Next.js Integration Examples

## 1. Basic Docker Setup

### Dockerfile
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build Next.js (with production values)
ENV NEXTAUTH_URL=https://production.example.com
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Install next-standalone-env
RUN npm install next-standalone-env

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy runtime configuration
COPY --chown=nextjs:nodejs runtime-env.config.js ./

USER nextjs

EXPOSE 3000

# Use runtime-aware server
CMD ["node", "node_modules/next-standalone-env/server.js"]
```

### runtime-env.config.js
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
    }
  },
  variables: ['NEXTAUTH_URL', 'NEXT_PUBLIC_API_URL'],
  envSelector: 'APP_ENV'
};
```

## 2. NextAuth Configuration

### app/api/auth/[...nextauth]/route.ts
```typescript
import NextAuth from 'next-auth';
import { NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';

const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  ],
  // NEXTAUTH_URL is now correctly set at runtime!
  // No need to hardcode URLs here
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

## 3. Custom Server with Middleware

### server.js
```javascript
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { patchProcessEnv } = require('next-standalone-env');

// Load your configuration
const config = require('./runtime-env.config');

// Patch environment before starting Next.js
patchProcessEnv(config);

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Environment: ${process.env.APP_ENV}`);
    console.log(`> NextAuth URL: ${process.env.NEXTAUTH_URL}`);
  });
});
```

## 4. Kubernetes Deployment

### deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nextjs-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nextjs-app
  template:
    metadata:
      labels:
        app: nextjs-app
    spec:
      containers:
      - name: app
        image: registry.example.com/nextjs-app:latest
        ports:
        - containerPort: 3000
        env:
        # Set the environment
        - name: APP_ENV
          value: "production"  # or development, staging
        
        # Node.js should always be production for Next.js
        - name: NODE_ENV
          value: "production"
        
        # Secrets from Kubernetes secrets
        - name: AZURE_AD_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: client-id
        
        - name: AZURE_AD_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: client-secret
        
        - name: AZURE_AD_TENANT_ID
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: tenant-id
        
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: nextauth-secret
        
        # Optional: Override specific values
        # - name: RUNTIME_NEXTAUTH_URL
        #   value: "https://custom.example.com"
        
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

### Different Environments in K8s

```bash
# Development
kubectl set env deployment/nextjs-app APP_ENV=development

# Staging
kubectl set env deployment/nextjs-app APP_ENV=staging

# Production
kubectl set env deployment/nextjs-app APP_ENV=production

# Custom override
kubectl set env deployment/nextjs-app RUNTIME_NEXTAUTH_URL=https://custom.example.com
```

## 5. Docker Compose for Local Development

### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      APP_ENV: ${APP_ENV:-development}
      NODE_ENV: production
      AZURE_AD_CLIENT_ID: ${AZURE_AD_CLIENT_ID}
      AZURE_AD_CLIENT_SECRET: ${AZURE_AD_CLIENT_SECRET}
      AZURE_AD_TENANT_ID: ${AZURE_AD_TENANT_ID}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      # Optional runtime override
      # RUNTIME_NEXTAUTH_URL: http://localhost:3000
    volumes:
      # Mount config for easy updates during development
      - ./runtime-env.config.js:/app/runtime-env.config.js:ro

  # Example database
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"
```

### .env files for docker-compose

**.env.development**
```env
APP_ENV=development
AZURE_AD_CLIENT_ID=dev-client-id
AZURE_AD_CLIENT_SECRET=dev-secret
AZURE_AD_TENANT_ID=dev-tenant
NEXTAUTH_SECRET=dev-secret
```

**.env.production**
```env
APP_ENV=production
AZURE_AD_CLIENT_ID=prod-client-id
AZURE_AD_CLIENT_SECRET=prod-secret
AZURE_AD_TENANT_ID=prod-tenant
NEXTAUTH_SECRET=prod-secret
```

**Usage:**
```bash
# Development
docker-compose --env-file .env.development up

# Production
docker-compose --env-file .env.production up
```

## 6. GitHub Actions CI/CD

### .github/workflows/deploy.yml
```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Registry
        uses: docker/login-action@v2
        with:
          registry: registry.example.com
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: |
            registry.example.com/app:latest
            registry.example.com/app:${{ github.sha }}
      
      - name: Deploy to Development
        run: |
          kubectl set image deployment/app \
            app=registry.example.com/app:${{ github.sha }} \
            -n development
          
          kubectl set env deployment/app \
            APP_ENV=development \
            -n development
      
      - name: Deploy to Staging
        if: github.ref == 'refs/heads/main'
        run: |
          kubectl set image deployment/app \
            app=registry.example.com/app:${{ github.sha }} \
            -n staging
          
          kubectl set env deployment/app \
            APP_ENV=staging \
            -n staging
```

## 7. Testing Different Environments Locally

### test-environments.sh
```bash
#!/bin/bash

IMAGE="myapp:latest"

echo "Testing Production Environment"
docker run --rm \
  -e APP_ENV=production \
  -e DEBUG=true \
  -p 3001:3000 \
  $IMAGE &

echo "Testing Development Environment"
docker run --rm \
  -e APP_ENV=development \
  -e DEBUG=true \
  -p 3002:3000 \
  $IMAGE &

echo "Testing with Runtime Override"
docker run --rm \
  -e APP_ENV=production \
  -e RUNTIME_NEXTAUTH_URL=http://localhost:3003 \
  -e DEBUG=true \
  -p 3003:3000 \
  $IMAGE &

echo ""
echo "Environments running on:"
echo "  Production: http://localhost:3001"
echo "  Development: http://localhost:3002"
echo "  Override: http://localhost:3003"
```