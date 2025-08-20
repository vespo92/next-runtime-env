#!/bin/bash

# NPM Package Publishing Script for next-runtime-env

set -e

echo "======================================"
echo "Publishing next-runtime-env to NPM"
echo "======================================"
echo ""

# Check if logged in to NPM
echo "Checking NPM login status..."
npm whoami &> /dev/null || {
  echo "You need to login to NPM first"
  echo "Run: npm login"
  exit 1
}

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist/

# Install dependencies
echo "Installing dependencies..."
npm install

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Run tests (when implemented)
# echo "Running tests..."
# npm test

# Show what will be published
echo ""
echo "Files to be published:"
npm pack --dry-run

echo ""
echo "Current version: $(node -p "require('./package.json').version")"
echo ""
echo "Choose version bump:"
echo "1) Patch (1.0.0 -> 1.0.1)"
echo "2) Minor (1.0.0 -> 1.1.0)"
echo "3) Major (1.0.0 -> 2.0.0)"
echo "4) Custom version"
echo "5) Skip version bump"
read -p "Selection: " choice

case $choice in
  1)
    npm version patch
    ;;
  2)
    npm version minor
    ;;
  3)
    npm version major
    ;;
  4)
    read -p "Enter version: " version
    npm version $version
    ;;
  5)
    echo "Skipping version bump"
    ;;
  *)
    echo "Invalid selection"
    exit 1
    ;;
esac

# Final confirmation
echo ""
echo "About to publish version: $(node -p "require('./package.json').version")"
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Publish to NPM
  npm publish --access public
  
  echo ""
  echo "✅ Successfully published to NPM!"
  echo ""
  echo "Package URL: https://www.npmjs.com/package/next-runtime-env"
  echo ""
  echo "Next steps:"
  echo "1. Create a GitHub repository"
  echo "2. Push the code: git push origin main --tags"
  echo "3. Create a GitHub release"
else
  echo "Publishing cancelled"
  exit 1
fi