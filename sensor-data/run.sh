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

# Check if we can run the binary (linux_amd64 on Mac)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "------------------------------------------------------------------"
    echo "WARNING: The backend is built for linux/amd64."
    echo "You are currently on macOS, so you cannot run this binary locally."
    echo "Please deploy the 'deploy/' folder to a Linux server to run it."
    echo "------------------------------------------------------------------"
    exit 1
fi

# Run backend
cd "$DEPLOY_DIR"
./sensor-backend
