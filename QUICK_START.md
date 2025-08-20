# Quick Start Guide for next-standalone-env

## 🚀 Get Started in 2 Minutes

### 1. Initialize and Build

```bash
# Clone the repository
git clone https://github.com/vespo92/next-standalone-env.git
cd next-standalone-env

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
next-standalone-env/
├── src/
│   └── index.ts           # Main TypeScript source
├── dist/                  # Compiled JavaScript (after build)
├── server.js              # Drop-in replacement server
├── examples/
│   ├── runtime-env.config.js    # Example configuration
│   ├── test-runtime.js          # Test script
│   └── nextjs-integration.md    # Integration examples
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
CMD ["npx", "next-standalone-env/server"]  # Patch at runtime
```

```bash
# Deploy same image everywhere
docker run -e APP_ENV=development image:latest
docker run -e APP_ENV=production image:latest
```

## 🔧 Testing with Your Next.js App

```bash
# 1. Install the package in your Next.js app
npm install next-standalone-env

# 2. Create a runtime configuration
cp node_modules/next-standalone-env/examples/runtime-env.config.js .

# 3. Test locally
APP_ENV=development npx next-standalone-env/server

# 4. Build Docker image
docker buildx build --platform linux/amd64 -t myapp-test .

# 5. Test different environments
docker run -e APP_ENV=development -p 3001:3000 myapp-test
docker run -e APP_ENV=production -p 3002:3000 myapp-test
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

**Created by**: Vinnie Espo
**Problem**: Next.js bakes environment variables at build time
**Solution**: Patch them at runtime!