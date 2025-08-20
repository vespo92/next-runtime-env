# Using next-runtime-env with ESPO Platform

This example shows how ESPO Platform can use `next-runtime-env` to solve the NEXTAUTH_URL issue.

## 1. Install the Package

```bash
cd /Users/vinnieespo/ESPO/Rome/apps/platform
npm install next-runtime-env
```

## 2. Create Runtime Configuration

Create `runtime-env.config.js` in the platform directory:

```javascript
// apps/platform/runtime-env.config.js
module.exports = {
  environments: {
    production: {
      vars: {
        NEXTAUTH_URL: 'https://platform.espocorp.com',
        NEXTAUTH_URL_INTERNAL: 'https://platform.espocorp.com',
        NEXT_PUBLIC_API_URL: 'https://platform.espocorp.com',
        NEXT_PUBLIC_FARO_URL: 'https://faro.espocorp.com',
        NEXT_PUBLIC_ENVIRONMENT: 'production'
      }
    },
    development: {
      vars: {
        NEXTAUTH_URL: 'https://platform-dev.espocorp.com',
        NEXTAUTH_URL_INTERNAL: 'https://platform-dev.espocorp.com',
        NEXT_PUBLIC_API_URL: 'https://platform-dev.espocorp.com',
        NEXT_PUBLIC_FARO_URL: 'https://faro-dev.espocorp.com',
        NEXT_PUBLIC_ENVIRONMENT: 'development'
      }
    },
    staging: {
      vars: {
        NEXTAUTH_URL: 'https://platform-staging.espocorp.com',
        NEXTAUTH_URL_INTERNAL: 'https://platform-staging.espocorp.com',
        NEXT_PUBLIC_API_URL: 'https://platform-staging.espocorp.com',
        NEXT_PUBLIC_FARO_URL: 'https://faro-staging.espocorp.com',
        NEXT_PUBLIC_ENVIRONMENT: 'staging'
      }
    },
    local: {
      vars: {
        NEXTAUTH_URL: 'http://localhost:3000',
        NEXTAUTH_URL_INTERNAL: 'http://localhost:3000',
        NEXT_PUBLIC_API_URL: 'http://localhost:3000',
        NEXT_PUBLIC_FARO_URL: 'http://localhost:8100',
        NEXT_PUBLIC_ENVIRONMENT: 'local'
      }
    }
  },
  
  variables: [
    'NEXTAUTH_URL',
    'NEXTAUTH_URL_INTERNAL',
    'DATABASE_URL',
    'REDIS_URL'
  ],
  
  envSelector: 'APP_ENV',
  debug: process.env.DEBUG === 'true'
};
```

## 3. Update Dockerfile

```dockerfile
# apps/platform/Dockerfile

# ... existing build stage ...

# Production stage
FROM registry.espocorp.com/mirror/node:20-alpine AS runner

WORKDIR /app

# Install runtime environment resolver
RUN npm install next-runtime-env

# ... copy built files ...

# Copy runtime configuration
COPY --from=builder --chown=nextjs:nodejs /app/apps/platform/runtime-env.config.js ./apps/platform/

# Use the runtime-aware server
CMD ["node", "node_modules/next-runtime-env/server.js"]
```

## 4. Update Kubernetes Deployment

```yaml
# espo-k8s/apps/base/platform/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: platform
  namespace: espo
spec:
  template:
    spec:
      containers:
      - name: platform
        image: espo-platform
        env:
        - name: NODE_ENV
          value: "production"
        - name: APP_ENV
          value: "production"  # This determines runtime URLs
        # Remove hardcoded NEXTAUTH_URL - it's now set at runtime!
        # - name: NEXTAUTH_URL
        #   value: "https://platform.espocorp.com"
```

## 5. Environment-Specific Overlays

### Development Overlay
```yaml
# espo-k8s/apps/overlays/development/platform/env-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: platform
  namespace: espo
spec:
  template:
    spec:
      containers:
      - name: platform
        env:
        - name: APP_ENV
          value: "development"
```

### Staging Overlay
```yaml
# espo-k8s/apps/overlays/staging/platform/env-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: platform
  namespace: espo
spec:
  template:
    spec:
      containers:
      - name: platform
        env:
        - name: APP_ENV
          value: "staging"
```

## 6. Testing the Solution

### Build Once
```bash
cd /Users/vinnieespo/ESPO/Rome
docker buildx build \
  --platform linux/amd64 \
  -t registry.espocorp.com/espo/platform:v2.0.0 \
  -f apps/platform/Dockerfile \
  .

docker push registry.espocorp.com/espo/platform:v2.0.0
```

### Deploy to Different Environments
```bash
# Development
kubectl set env deployment/platform APP_ENV=development -n espo

# Production
kubectl set env deployment/platform APP_ENV=production -n espo

# Staging
kubectl set env deployment/platform APP_ENV=staging -n espo
```

### Verify
```bash
# Check the logs
kubectl logs -n espo deployment/platform | grep next-runtime-env

# You should see:
# [next-runtime-env] Starting server with environment: development
# [next-runtime-env] Setting NEXTAUTH_URL=https://platform-dev.espocorp.com
# [next-runtime-env] Server ready on http://0.0.0.0:3000
# [next-runtime-env] NextAuth URL: https://platform-dev.espocorp.com
```

## 7. Benefits for ESPO

1. **Single Docker Image**: Build once, deploy everywhere
2. **No Rebuilds**: Change environments without rebuilding
3. **Correct OAuth**: Each environment uses its correct callback URL
4. **Simplified CI/CD**: One build step instead of three
5. **Easy Rollbacks**: Previous images work in any environment
6. **Cost Savings**: Less build time, less storage for images

## 8. Migration Path

1. **Phase 1**: Test in development
   - Deploy to dev with APP_ENV=development
   - Verify OAuth callbacks work

2. **Phase 2**: Staging validation
   - Deploy same image to staging with APP_ENV=staging
   - Test all auth flows

3. **Phase 3**: Production rollout
   - Deploy to production with APP_ENV=production
   - Monitor for any issues

4. **Phase 4**: Cleanup
   - Remove build-time NEXTAUTH_URL from CI/CD
   - Update documentation

## 9. Troubleshooting

### Debug Mode
```yaml
env:
- name: DEBUG
  value: "true"
- name: APP_ENV
  value: "development"
```

### Manual Override
```yaml
env:
- name: RUNTIME_NEXTAUTH_URL
  value: "https://custom.espocorp.com"
```

### Check Runtime Values
```bash
kubectl exec -n espo deployment/platform -- node -e "console.log(process.env.NEXTAUTH_URL)"
```