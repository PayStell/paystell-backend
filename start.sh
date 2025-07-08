#!/bin/sh

# Wait for database to be ready
echo "Waiting for database to be ready..."
while ! nc -z postgres 5432; do
  sleep 0.1
done
echo "Database is ready!"

# Wait for Redis to be ready
echo "Waiting for Redis to be ready..."
while ! nc -z redis 6379; do
  sleep 0.1
done
echo "Redis is ready!"

# Run migrations using compiled JavaScript files
echo "Running migrations..."
npx typeorm-ts-node-commonjs migration:run -d dist/config/db.js

# Start the application with debugging
echo "Starting the application..."
echo "Current directory: $(pwd)"
echo "Listing dist directory:"
ls -la dist/
echo "Starting Node.js application..."
node dist/index.js 
