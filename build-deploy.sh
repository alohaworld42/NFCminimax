#!/bin/bash

# NFC Smart Home Build and Deploy Script
# Builds and deploys the complete application with all integrations

echo "🚀 NFC Smart Home - Build and Deploy Script"
echo "==========================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js 16+"
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the web application
echo "🏗️ Building web application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Web build failed"
    exit 1
fi

echo "✅ Web build completed successfully"

# Copy built files to android assets
echo "📱 Preparing Android assets..."
mkdir -p android/app/src/main/assets
cp -r dist/* android/app/src/main/assets/

# Build Android app if Capacitor is available
if command_exists npx; then
    echo "🔧 Syncing with Capacitor..."
    npx cap sync android
    
    echo "📦 Building Android APK..."
    cd android
    ./gradlew assembleDebug
    
    if [ $? -eq 0 ]; then
        echo "✅ Android APK built successfully"
        echo "📱 APK location: android/app/build/outputs/apk/debug/app-debug.apk"
    else
        echo "⚠️ Android build failed - you can still run on device with: npx cap run android"
    fi
    cd ..
fi

# Deploy Edge Functions if Supabase CLI is available
if command_exists supabase; then
    echo "⚡ Deploying Edge Functions..."
    cd supabase
    
    # Deploy all functions
    for func_dir in functions/*; do
        if [ -d "$func_dir" ]; then
            func_name=$(basename "$func_dir")
            echo "  Deploying $func_name..."
            supabase functions deploy "$func_name"
            
            if [ $? -ne 0 ]; then
                echo "  ⚠️ Failed to deploy $func_name"
            else
                echo "  ✅ $func_name deployed"
            fi
        fi
    done
    
    cd ..
fi

echo ""
echo "🎉 Build and Deploy Complete!"
echo "============================="
echo ""
echo "Next steps:"
echo "1. Test the web application: npm run preview"
echo "2. Run on Android device: npx cap run android"
echo "3. Open in Android Studio: npx cap open android"
echo ""
echo "📋 Available endpoints:"
echo "• Web App: http://localhost:4173"
echo "• Supabase: https://jrchntonfshqvorcfvqh.supabase.co"
echo ""
