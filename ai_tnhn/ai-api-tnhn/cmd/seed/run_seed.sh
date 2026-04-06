#!/bin/bash

# Navigate to the root folder (ai-api-tnhn)
cd "$(dirname "$0")/../.." || exit

echo "🚀 Starting Database Seeding Process..."

# Run the seed command using the project's config loader
# It will automatically pick up any .env variables or system ENV
go run cmd/seed/main.go

if [ $? -eq 0 ]; then
    echo "✅ Seeding successful!"
else
    echo "❌ Seeding failed. Please check your database connection and logs."
    exit 1
fi
