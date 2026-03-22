#!/bin/bash

# Exit on error
set -e

echo "Starting build process for Sensor Data project..."

# Define directories
ROOT_DIR=$(pwd)
DEPLOY_DIR="$ROOT_DIR/deploy"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# 1. Clean and prepare deploy directory
echo "Cleaning and preparing deploy directory: $DEPLOY_DIR"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/frontend"

# 2. Build Backend
echo "Building Backend (Go) for host platform..."
cd "$BACKEND_DIR"
go build -o "$DEPLOY_DIR/sensor-backend" main.go
echo "Backend build complete: $DEPLOY_DIR/sensor-backend"

# 3. Build Frontend
echo "Building Frontend (Vite)..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi
# Inject production API URL (Relative path "" recommended if served by same BE)
echo "Injecting VITE_APP_API_URL=https://quantractudong.sqr.vn"
VITE_APP_API_URL="https://quantractudong.sqr.vn" npm run build

echo "Copying frontend build to deploy directory..."
cp -r dist/* "$DEPLOY_DIR/frontend/"
echo "Frontend build complete: $DEPLOY_DIR/frontend"

# 4. Copy configuration (if exists)
if [ -f "$BACKEND_DIR/.env" ]; then
    echo "Copying .env file to deploy directory..."
    cp "$BACKEND_DIR/.env" "$DEPLOY_DIR/"
fi

echo "--------------------------------------------------"
echo "Build successful! Artifacts are in: $DEPLOY_DIR"
echo "To run the system, use: ./run.sh"
echo "--------------------------------------------------"
