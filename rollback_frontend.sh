#!/bin/bash

# Frontend Rollback Script
# Rolls back to the previous frontend version

set -e

echo "🔄 Starting Frontend Rollback..."

# Check if we're in the right directory
if [ ! -f "ratemyrations/app.py" ]; then
    echo "❌ Error: Must be run from RateMyRations root directory"
    exit 1
fi

# Find the most recent backup
BACKUP_DIR=$(ls -td frontend_backup_* 2>/dev/null | head -1)

if [ -z "$BACKUP_DIR" ]; then
    echo "❌ Error: No backup directory found"
    echo "Available backups:"
    ls -la frontend_backup_* 2>/dev/null || echo "  No backups found"
    exit 1
fi

echo "📦 Found backup: $BACKUP_DIR"

# Verify backup files exist
if [ ! -f "$BACKUP_DIR/index.html" ] || [ ! -f "$BACKUP_DIR/script.js" ] || [ ! -f "$BACKUP_DIR/styles.css" ]; then
    echo "❌ Error: Backup files are incomplete"
    exit 1
fi

# Restore files
echo "🔄 Restoring frontend files..."
cp "$BACKUP_DIR/index.html" ratemyrations/templates/
cp "$BACKUP_DIR/script.js" ratemyrations/static/
cp "$BACKUP_DIR/styles.css" ratemyrations/static/

# Remove migration flag
if [ -f ".frontend_migrated" ]; then
    echo "📝 Removing migration flag..."
    rm .frontend_migrated
fi

# Revert version numbers
echo "📝 Reverting version numbers..."
sed -i 's/Version 1\.1\.0/Version 1.0.10/g' ratemyrations/templates/index.html
sed -i 's/Version 1\.1\.0/Version 1.0.10/g' ratemyrations/templates/about.html

echo "✅ Rollback completed successfully!"
echo ""
echo "📋 Rollback Summary:"
echo "  - Restored from backup: $BACKUP_DIR"
echo "  - Old frontend is now active"
echo "  - Version reverted to 1.0.10"
echo "  - Migration flag removed"
echo ""
echo "🎉 The old frontend is now live!"
echo ""
echo "To migrate again:"
echo "  ./migrate_frontend.sh"
