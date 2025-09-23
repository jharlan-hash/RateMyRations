#!/bin/bash

# Frontend Migration Script
# Migrates from old frontend to new modular frontend

set -e

echo "🚀 Starting Frontend Migration..."

# Check if we're in the right directory
if [ ! -f "ratemyrations/app.py" ]; then
    echo "❌ Error: Must be run from RateMyRations root directory"
    exit 1
fi

# Backup current frontend
echo "📦 Creating backup of current frontend..."
BACKUP_DIR="frontend_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup current files
cp ratemyrations/templates/index.html "$BACKUP_DIR/"
cp ratemyrations/static/script.js "$BACKUP_DIR/"
cp ratemyrations/static/styles.css "$BACKUP_DIR/"

echo "✅ Backup created in $BACKUP_DIR"

# Build new frontend
echo "🔨 Building new frontend..."
npm run build:prod

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Aborting migration."
    exit 1
fi

echo "✅ New frontend built successfully"

# Create migration flag file
echo "📝 Creating migration flag..."
echo "migrated_at=$(date -Iseconds)" > .frontend_migrated

# Update version in templates
echo "📝 Updating version numbers..."
sed -i 's/Version 1\.0\.10/Version 1.1.0/g' ratemyrations/templates/index.html
sed -i 's/Version 1\.0\.10/Version 1.1.0/g' ratemyrations/templates/about.html

# Replace old template with new one
echo "🔄 Replacing HTML template..."
cp ratemyrations/templates/index_new.html ratemyrations/templates/index.html

echo "✅ Migration completed successfully!"
echo ""
echo "📋 Migration Summary:"
echo "  - Old frontend backed up to: $BACKUP_DIR"
echo "  - New modular frontend deployed"
echo "  - Version updated to 1.1.0"
echo "  - Migration flag created"
echo ""
echo "🎉 The new frontend is now live!"
echo ""
echo "To rollback if needed:"
echo "  cp $BACKUP_DIR/index.html ratemyrations/templates/"
echo "  cp $BACKUP_DIR/script.js ratemyrations/static/"
echo "  cp $BACKUP_DIR/styles.css ratemyrations/static/"
echo "  rm .frontend_migrated"
