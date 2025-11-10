#!/bin/bash
# Test Frontend Build
# Verifies the frontend builds successfully for production

set -e

echo "=========================================="
echo "Testing Frontend Production Build"
echo "=========================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Set test environment variable
export NEXT_PUBLIC_API_URL="https://test-backend.example.com"

# Run linting
echo "Running linter..."
npm run lint
echo "✓ Linting passed"
echo ""

# Run tests
echo "Running tests..."
npm test
echo "✓ Tests passed"
echo ""

# Build for production
echo "Building for production..."
npm run build
echo "✓ Build successful"
echo ""

# Check build output
echo "Build output:"
ls -lh .next/
echo ""

# Analyze bundle size
echo "Bundle size analysis:"
du -sh .next/static/chunks/*
echo ""

echo "=========================================="
echo "Frontend build test completed successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Deploy to Vercel: vercel --prod"
echo "2. Or build Docker image: docker build -t frontend ."
echo ""
