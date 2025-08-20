# Quick Start Guide for next-runtime-env

## 🚀 Get Started in 2 Minutes

### 1. Initialize and Build

```bash
cd /Users/vinnieespo/ESPO/NEXT_DEV_ENV

# Install dependencies
npm install

# Build TypeScript
npm run build

# Test it works
node examples/test-runtime.js
```

### 2. Test with Different Environments

```bash
# Production
APP_ENV=production node examples/test-runtime.js

# Development
APP_ENV=development node examples/test-runtime.js

# With override
RUNTIME_NEXTAUTH_URL=https://custom.com APP_ENV=production node examples/test-runtime.js
```

### 3. Publish to NPM

```bash
# Login to NPM (first time only)
npm login

# Publish
./publish.sh
```

## 📦 Package Structure

```
next-runtime-env/
├── src/
│   └── index.ts           # Main TypeScript source
├── dist/                  # Compiled JavaScript (after build)
├── server.js              # Drop-in replacement server
├── examples/
│   ├── runtime-env.config.js    # Example configuration
│   ├── test-runtime.js          # Test script
│   ├── nextjs-integration.md    # Integration examples
│   └── espo-platform-example.md # ESPO-specific guide
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

## 🎯 Key Features

1. **Runtime Resolution**: Environment variables determined at container start, not build time
2. **Single Image**: One Docker image works in all environments
3. **Drop-in Server**: Replace Next.js standalone server with zero code changes
4. **TypeScript**: Full TypeScript support with type definitions
5. **Flexible Config**: JSON configuration or programmatic API
6. **Debug Mode**: Detailed logging to troubleshoot issues
7. **Override Support**: RUNTIME_* prefix for last-minute changes

## 💡 How It Solves The Problem

**Before** (Different images per environment):
```dockerfile
# Dockerfile.dev
ENV NEXTAUTH_URL=https://dev.example.com
RUN npm run build  # Bakes in dev URL

# Dockerfile.prod  
ENV NEXTAUTH_URL=https://prod.example.com
RUN npm run build  # Bakes in prod URL
```

**After** (Single image for all):
```dockerfile
# Dockerfile
RUN npm run build  # Build once with any URL
CMD ["npx", "next-runtime-env/server"]  # Patch at runtime
```

```bash
# Deploy same image everywhere
docker run -e APP_ENV=development image:latest
docker run -e APP_ENV=production image:latest
```

## 🔧 Testing with ESPO Platform

```bash
# 1. Copy the solution to Platform
cp -r src/* /Users/vinnieespo/ESPO/Rome/apps/platform/lib/runtime-env/
cp server.js /Users/vinnieespo/ESPO/Rome/apps/platform/
cp examples/runtime-env.config.js /Users/vinnieespo/ESPO/Rome/apps/platform/

# 2. Test locally
cd /Users/vinnieespo/ESPO/Rome/apps/platform
APP_ENV=development node server.js

# 3. Build Docker image
docker buildx build --platform linux/amd64 -t platform-test .

# 4. Test different environments
docker run -e APP_ENV=development -p 3001:3000 platform-test
docker run -e APP_ENV=production -p 3002:3000 platform-test
```

## 📝 Publishing Checklist

- [ ] Update version in package.json
- [ ] Update README with any new features
- [ ] Test all examples work
- [ ] Build TypeScript (`npm run build`)
- [ ] Login to NPM (`npm login`)
- [ ] Publish (`npm publish --access public`)
- [ ] Create GitHub repository
- [ ] Push code with tags
- [ ] Create GitHub release
- [ ] Update ESPO Platform to use published package

## 🤝 Contributing

This package solves a real problem many Next.js developers face. Contributions welcome!

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📚 Resources

- [Next.js Standalone Mode](https://nextjs.org/docs/app/api-reference/next-config-js/output)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Kubernetes ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)

## 🎉 Success Metrics

When properly implemented, you should see:

1. **Build Time**: Reduced by 66% (build once vs three times)
2. **Storage**: Reduced by 66% (one image vs three)
3. **Deployment**: Simplified (same image everywhere)
4. **Rollback**: Easier (any version works in any environment)
5. **Testing**: Improved (test same image that goes to production)

## 💬 Feedback

Found this helpful? Let me know!
- ⭐ Star the repo
- 🐛 Report issues
- 💡 Suggest features
- 📢 Share with others who might need it

---

**Created by**: Vinnie Esposito
**Problem**: Next.js bakes environment variables at build time
**Solution**: Patch them at runtime!