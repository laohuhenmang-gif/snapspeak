#!/bin/bash

# SnapSpeak Release Build Script
# Usage: ./scripts/build-release.sh [version]

set -e

VERSION=${1:-"2.0.0"}
VERSION_CODE=$(echo $VERSION | awk -F. '{print $1 * 10000 + $2 * 100 + $3}')

echo "========================================="
echo "  SnapSpeak Release Build"
echo "  Version: $VERSION ($VERSION_CODE)"
echo "========================================="

# Update version in package.json
echo "Updating version in package.json..."
node -e "const pkg = require('./package.json'); pkg.version = '$VERSION'; require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n')"

# Clean previous builds
echo "Cleaning previous builds..."
cd android
./gradlew clean
cd ..

# Bundle JS
echo "Bundling JavaScript..."
npx expo export --platform android

# Build APK (universal)
echo "Building universal APK..."
cd android
./gradlew assembleRelease -PversionCode=$VERSION_CODE -PversionName=$VERSION

# Build AAB (for Play Store)
echo "Building App Bundle..."
./gradlew bundleRelease -PversionCode=$VERSION_CODE -PversionName=$VERSION

echo "========================================="
echo "  Build Complete!"
echo "  APK: android/app/build/outputs/apk/universal/release/"
echo "  AAB: android/app/build/outputs/bundle/universalRelease/"
echo "========================================="
