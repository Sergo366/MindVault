#!/bin/bash

# Script to fix npm cache permissions and install dependencies
# This resolves the EACCES permission denied errors

echo "🔧 Fixing npm cache permissions..."

# Fix npm cache ownership
sudo chown -R $(whoami) ~/.npm

echo "✅ NPM cache permissions fixed"
echo ""
echo "📦 Installing dependencies..."

# Install dependencies from root (this installs for all workspaces)
npm install

echo ""
echo "✅ Installation complete!"
echo ""
echo "🚀 You can now run:"
echo "   npm run dev        # Run both client and server"
echo "   npm run dev:server # Run server only"
echo "   npm run dev:client # Run client only"
