#!/bin/bash
# A script to fully restart the Next.js app and clear all caches

echo "=== Stopping any running Next.js processes ==="
pkill -f "npm run dev" || true
pkill -f "ts-node server.ts" || true
pkill -f "next" || true

echo "=== Clearing Next.js cache ==="
rm -rf .next
rm -rf node_modules/.cache

echo "=== Starting development server ==="
npm run dev