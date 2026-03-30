#!/bin/bash

# Script to run both Backend and Frontend for Thoat Nuoc Ha Noi

# Get the directory where the script is located
BASE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}   Starting Thoat Nuoc Ha Noi Application...   ${NC}"
echo -e "${BLUE}===============================================${NC}"

# Kill existing processes on ports
echo -e "${RED}[Cleanup] Killing existing processes on port 8089...${NC}"
lsof -i :8089 -t 2>/dev/null | xargs kill -9 2>/dev/null
sleep 1

# Function to kill child processes on exit
cleanup() {
    echo -e "\n${RED}Stopping services...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo -e "${GREEN}[Backend] Starting ai-api-tnhn...${NC}"
cd "$BASE_DIR/ai_tnhn/ai-api-tnhn" || exit
go run main.go &
BACKEND_PID=$!

# Start Frontend
echo -e "${GREEN}[Frontend] Starting ai-frontend-tnhn...${NC}"
cd "$BASE_DIR/ai_tnhn/ai-frontend-tnhn" || exit
npm run start &
FRONTEND_PID=$!

echo -e "${BLUE}Both services are running.${NC}"
echo -e "${BLUE}Press CTRL+C to stop both services.${NC}"

# Wait for processes
wait
