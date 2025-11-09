#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy || echo "No migrations to deploy"

echo "Generating Prisma client..."
npx prisma generate

echo "Starting application..."
exec "$@"
