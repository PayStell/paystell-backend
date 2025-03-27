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

# Run migrations
echo "Running migrations..."
npm run migration:run

# Start the application
echo "Starting the application..."
node dist/index.js 