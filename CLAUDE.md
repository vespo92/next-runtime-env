# Claude Context for next-standalone-env

## Project Overview

This is an open-source NPM package that solves a critical Next.js deployment issue: environment variables being baked in at build time when using standalone mode (Docker deployments). The package enables runtime environment variable resolution, allowing the same Docker image to work across multiple environments.

## Problem Being Solved

When Next.js builds in standalone mode for Docker:
- Environment variables like `NEXTAUTH_URL` are hardcoded at build time
- This breaks the "build once, deploy many" Docker pattern
- OAuth callbacks fail when URLs don't match the build-time values
- Teams need separate Docker images for dev, staging, and production

## Solution Architecture

The package provides runtime patching of environment variables through:

1. **Runtime URL Resolver** (`src/index.ts`)
   - Resolves environment variables based on `APP_ENV` or custom selectors
   - Supports runtime overrides with `RUNTIME_` prefix
   - Validates configuration and provides debug logging

2. **Custom Server Wrapper** (`server.js`)
   - Drop-in replacement for Next.js standalone server
   - Patches environment before Next.js initialization
   - Maintains compatibility with existing Next.js features

3. **Configuration System** (`runtime-env.config.js`)
   - Define environment-specific variables
   - Set validation rules
   - Configure debug options

## Key Features

- **Zero Next.js Modifications**: Works with unmodified Next.js apps
- **TypeScript Support**: Full type definitions included
- **Flexible Configuration**: JSON or JavaScript config files
- **Runtime Overrides**: `RUNTIME_` prefix for dynamic values
- **NextAuth Compatible**: Properly handles `NEXTAUTH_URL` and `NEXTAUTH_URL_INTERNAL`
- **Debug Mode**: Comprehensive logging for troubleshooting

## Usage Patterns

### Basic Docker Setup
```dockerfile
FROM node:20-alpine
# Build your Next.js app in standalone mode
# Then use our server
COPY --from=builder /app/node_modules/next-standalone-env/server.js ./server.js
CMD ["node", "server.js"]
```

### Environment Selection
```bash
# Development
docker run -e APP_ENV=development your-image

# Production
docker run -e APP_ENV=production your-image

# With runtime override
docker run -e APP_ENV=production -e RUNTIME_NEXTAUTH_URL=https://custom.example.com your-image
```

### Kubernetes ConfigMap
```yaml
env:
  - name: APP_ENV
    value: "production"
  - name: RUNTIME_NEXTAUTH_URL
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: auth-url
```

## Technical Implementation

### Environment Resolution Priority
1. `RUNTIME_*` prefixed variables (highest priority)
2. Environment-specific configuration from `runtime-env.config.js`
3. Existing environment variables
4. Default values

### Supported Environment Selectors
- `APP_ENV` (recommended)
- `NODE_ENV` (fallback)
- Custom via `envSelector` config

### Public vs Private Variables
- `NEXT_PUBLIC_*` variables are included in client-side bundles
- Non-prefixed variables are server-side only
- Special handling for `NEXTAUTH_URL` → `NEXTAUTH_URL_INTERNAL`

## Development Workflow

### Testing Locally
```bash
# Test different environments
APP_ENV=development node examples/test-runtime.js
APP_ENV=production node examples/test-runtime.js

# Test with runtime override
APP_ENV=production RUNTIME_NEXTAUTH_URL=https://test.com node examples/test-runtime.js
```

### Building
```bash
npm run build  # Compile TypeScript
npm test       # Run tests (placeholder for now)
npm run lint   # Check code style
```

### Publishing Updates
```bash
npm version patch  # or minor/major
npm publish --access public
git push origin main --tags
```

## File Structure

```
/Users/vinnieespo/ESPO/NEXT_DEV_ENV/
├── src/
│   └── index.ts           # Core TypeScript implementation
├── dist/                  # Compiled JavaScript (git-ignored)
│   ├── index.js
│   └── index.d.ts
├── examples/
│   ├── test-runtime.js    # Example usage script
│   └── runtime-env.config.js  # Example configuration
├── server.js              # Standalone server replacement
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
└── CLAUDE.md             # This file
```

## NPM Package Details

- **Package Name**: `next-standalone-env`
- **NPM URL**: https://www.npmjs.com/package/next-standalone-env
- **GitHub**: https://github.com/vespo92/next-standalone-env
- **Author**: Vinnie Espo <vespo92@gmail.com>
- **License**: MIT
- **Current Version**: 1.0.1

## Common Use Cases

1. **Multi-environment Docker Deployments**
   - Single image for dev/staging/prod
   - Environment-specific OAuth callbacks
   - Different API endpoints per environment

2. **Kubernetes Deployments**
   - ConfigMap-based configuration
   - Namespace-specific settings
   - GitOps-friendly (no rebuild needed)

3. **CI/CD Pipelines**
   - Build once in CI
   - Deploy to multiple environments
   - No environment-specific build steps

## Troubleshooting

### Debug Mode
Enable detailed logging:
```bash
DEBUG=true APP_ENV=production node server.js
```

### Common Issues

1. **OAuth Redirect Mismatch**
   - Ensure `NEXTAUTH_URL` matches your OAuth provider's callback URL
   - Use `RUNTIME_NEXTAUTH_URL` for dynamic overrides

2. **Environment Not Detected**
   - Check `APP_ENV` is set correctly
   - Verify `runtime-env.config.js` includes your environment

3. **Variables Not Updating**
   - Confirm variable is in the `variables` array
   - Check for typos in `RUNTIME_` prefixed vars
   - Enable debug mode to see resolution process

## Future Enhancements

Potential improvements to consider:
- [ ] Automatic environment detection from hostname
- [ ] Support for `.env.runtime` files
- [ ] Webpack plugin for build-time optimization
- [ ] Validation schema support (Zod/Yup)
- [ ] Multi-stage environment inheritance
- [ ] Secret management integration
- [ ] Automatic OAuth provider URL updates

## Contributing

This is an open-source project. Contributions welcome:
- Report issues: https://github.com/vespo92/next-standalone-env/issues
- Submit PRs with tests
- Improve documentation
- Share use cases and patterns

## Original Context

This package was created to solve a real production issue where Next.js applications deployed via Docker to Kubernetes were failing OAuth authentication due to hardcoded `NEXTAUTH_URL` values. The solution has been battle-tested in production environments with multiple deployment targets.

---

_Last updated: 2025-08-20_