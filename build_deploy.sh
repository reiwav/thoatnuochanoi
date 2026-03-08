#!/bin/bash

# Exit on any error
set -e

# Get current directory to ensure we run from the application folder
BASE_DIR="$(pwd)"
if [[ ! -d "ai_tnhn" ]]; then
    echo "Please run this script from the 'application' directory."
    exit 1
fi

# Create deploy directory with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DEPLOY_DIR="$BASE_DIR/deploy/$TIMESTAMP"

echo "Creating deployment directory at $DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# 1. Build the Go API for Linux
echo "Building API for Linux (amd64)..."
cd "$BASE_DIR/ai_tnhn/ai-api-tnhn"
GOOS=linux GOARCH=amd64 go build -o "$DEPLOY_DIR/api_linux_amd64" main.go
echo "API build complete."

# 2. Build the Frontend
echo "Building Frontend (Vite)..."
cd "$BASE_DIR/ai_tnhn/ai-frontend-tnhn"
# Build the project with production API URL
export VITE_APP_API_URL="https://hsdc.reiway.vn"
export VITE_APP_PHOTO_URL="https://hsdc.reiway.vn"
export VITE_APP_IMAGE_URL="https://hsdc.reiway.vn"

npm run build

# Copy frontend build to deploy folder
if [ -d "dist" ]; then
    cp -r dist "$DEPLOY_DIR/frontend_dist"
elif [ -d "build" ]; then
    cp -r build "$DEPLOY_DIR/frontend_build"
else
    echo "Warning: Neither 'dist' nor 'build' folder found after frontend build!"
fi
echo "Frontend build complete."

echo "--------------------------------------------------------"
echo "Build successfully finished. Artifacts are at:"
echo "$DEPLOY_DIR"
echo "--------------------------------------------------------"
