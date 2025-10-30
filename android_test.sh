#!/bin/bash

echo "Testing Android Platform Configuration..."

# Check if required files exist
if [ -f "android/app/src/main/AndroidManifest.xml" ]; then
    echo "✓ AndroidManifest.xml exists"
else
    echo "✗ AndroidManifest.xml missing"
    exit 1
fi

if [ -f "android/app/build.gradle" ]; then
    echo "✓ App build.gradle exists"
else
    echo "✗ App build.gradle missing"
    exit 1
fi

if [ -f "android/build.gradle" ]; then
    echo "✓ Root build.gradle exists"
else
    echo "✗ Root build.gradle missing"
    exit 1
fi

if [ -f "android/app/src/main/java/com/nfcsmarthome/app/MainActivity.java" ]; then
    echo "✓ MainActivity.java exists"
else
    echo "✗ MainActivity.java missing"
    exit 1
fi

if [ -f "android/app/src/main/java/com/nfcsmarthome/app/NFCPlugin.java" ]; then
    echo "✓ NFCPlugin.java exists"
else
    echo "✗ NFCPlugin.java missing"
    exit 1
fi

# Check NFC permissions in manifest
if grep -q "android.permission.NFC" android/app/src/main/AndroidManifest.xml; then
    echo "✓ NFC permission found"
else
    echo "✗ NFC permission missing"
    exit 1
fi

echo "Android platform configuration is valid!"
echo "Ready for CI/CD build process."