#!/bin/bash

echo "Starting Sensor Data project from deploy directory..."

# Define directories
ROOT_DIR=$(pwd)
DEPLOY_DIR="$ROOT_DIR/deploy"

# Check if deploy directory exists
if [ ! -d "$DEPLOY_DIR" ]; then
    echo "Deploy directory not found! Running build first..."
    ./build.sh
fi

# Check if we can run the binary
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Running on macOS..."
fi

# Run backend
cd "$DEPLOY_DIR"
./sensor-backend
