#!/bin/bash

# Demo Seed Script for Carrots App
# This script populates the database with the conversation example

echo "🥕 Carrots Demo Seed Script"
echo "============================="
echo ""
echo "This will populate the database with the household commitments example:"
echo "- Anna, Bella, Celia, and The Cat"
echo "- 6 commitments demonstrating various conditional relationships"
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: This script must be run from the backend directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
npx tsc prisma/demo-seed.ts --outDir prisma/dist --esModuleInterop --resolveJsonModule --skipLibCheck --module commonjs --target es2020

# Run the seed script
echo "🌱 Seeding database..."
node prisma/dist/demo-seed.js

# Clean up compiled files
rm -rf prisma/dist

echo ""
echo "✨ Demo seed completed!"
echo ""
echo "You can now start the server and log in with any of the demo accounts."
