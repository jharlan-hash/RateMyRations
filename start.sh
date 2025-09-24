#!/bin/bash

# RateMyRations Start Script
# Simple and informative startup

set -e

echo "🚀 Starting RateMyRations..."

# Check if we're in the right directory
if [ ! -f "ratemyrations/app.py" ]; then
    echo "❌ Error: Must be run from RateMyRations root directory"
    exit 1
fi

# Set required environment variables
export ADMIN_TOKEN=${ADMIN_TOKEN:-"mega_gooner"}
export RATE_LIMIT_STORAGE_URI=${RATE_LIMIT_STORAGE_URI:-"memory://"}

echo "📋 Configuration:"
echo "  - Admin Token: ${ADMIN_TOKEN}"
echo "  - Rate Limit Storage: ${RATE_LIMIT_STORAGE_URI}"
echo "  - Workers: 4"
echo "  - Port: 8000"

# Initialize database
echo "🗄️  Initializing database..."
python3 ratemyrations/database.py

# Start Gunicorn
echo "⚙️  Starting Gunicorn server..."
gunicorn -w 4 -b 0.0.0.0:8000 ratemyrations.wsgi:application &
GUNICORN_PID=$!

echo "✅ Gunicorn started (PID: $GUNICORN_PID)"

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
sleep 3

# Test if server is responding
if curl -s "http://localhost:8000/healthz" > /dev/null 2>&1; then
    echo "✅ Server is responding"
else
    echo "⚠️  Server not responding yet (may need more time)"
fi

# Warm the cache
echo "🔥 Warming cache..."
python3 warm_cache.py http://localhost:8000 2>/dev/null || echo "⚠️  Cache warming failed (non-critical)"

echo ""
echo "🎉 RateMyRations is ready!"
echo ""
echo "📊 Server Information:"
echo "  - PID: $GUNICORN_PID"
echo "  - Local: http://localhost:8000"
echo "  - External: https://rations.jacksovern.xyz"
echo "  - Admin: http://localhost:8000/admin?token=$ADMIN_TOKEN"
echo ""
echo "🛑 To stop: kill $GUNICORN_PID"
echo "📊 To check status: ps -p $GUNICORN_PID"
echo ""
echo "Press Ctrl+C to stop, or run in background with: ./start.sh &"

# Handle Ctrl+C gracefully
trap 'echo -e "\n🛑 Shutting down RateMyRations..."; kill $GUNICORN_PID 2>/dev/null; exit 0' INT

# Keep script running to show logs
wait $GUNICORN_PID