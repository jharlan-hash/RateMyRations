#!/bin/bash

# RateMyRations startup script
# Starts Gunicorn and warms the cache

set -e

echo "Starting RateMyRations..."

# Start Gunicorn in background
echo "Starting Gunicorn with 4 workers..."
export RATE_LIMIT_STORAGE_URI=redis://127.0.0.1:6379/0
export ADMIN_TOKEN=mega_gooner
gunicorn -w 4 -b 0.0.0.0:8000 ratemyrations.wsgi:application &
GUNICORN_PID=$!

# Wait for Gunicorn to start up
echo "Waiting for Gunicorn to start..."
sleep 5

# Check if Gunicorn is running
if ! kill -0 $GUNICORN_PID 2>/dev/null; then
    echo "Error: Gunicorn failed to start"
    exit 1
fi

echo "Gunicorn started successfully (PID: $GUNICORN_PID)"

# Wait a bit more for workers to be ready
sleep 3

# Warm the cache
echo "Warming cache for all workers..."
python3 warm_cache.py http://localhost:8000

echo "RateMyRations is ready!"
echo "Gunicorn PID: $GUNICORN_PID"
echo "Access at: http://localhost:8000"

# Keep the script running and show logs
echo "Press Ctrl+C to stop"
wait $GUNICORN_PID
