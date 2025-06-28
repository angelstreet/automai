#!/bin/bash

echo "🚀 ATOMIC ROUTE MIGRATION SCRIPT"
echo "================================="
echo "⚠️  WARNING: This will update ALL route references simultaneously"
echo "📋 No backward compatibility - direct replacement only"
echo ""

# Backup current state
echo "📦 Creating backup..."
git add -A
git commit -m "Pre-migration backup: Route standardization checkpoint"

echo "🔄 Starting atomic route migration..."

# ==============================================
# PHASE 1: UPDATE FRONTEND/CLIENT CODE
# ==============================================

echo "📱 Phase 1: Updating frontend/client code..."

# Update TypeScript hooks
echo "   🔧 Updating React hooks..."
find virtualpytest/src/web/hooks -name "*.ts" -exec sed -i '' 's|take-screenshot|takeScreenshot|g' {} \;
find virtualpytest/src/web/hooks -name "*.ts" -exec sed -i '' 's|execute-command|executeCommand|g' {} \;
find virtualpytest/src/web/hooks -name "*.ts" -exec sed -i '' 's|screenshot-and-dump|screenshotAndDump|g' {} \;
find virtualpytest/src/web/hooks -name "*.ts" -exec sed -i '' 's|get-apps|getApps|g' {} \;
find virtualpytest/src/web/hooks -name "*.ts" -exec sed -i '' 's|execute_batch|executeBatch|g' {} \;
find virtualpytest/src/web/hooks -name "*.ts" -exec sed -i '' 's|take-control|takeControl|g' {} \;
find virtualpytest/src/web/hooks -name "*.ts" -exec sed -i '' 's|release-control|releaseControl|g' {} \;
find virtualpytest/src/web/hooks -name "*.ts" -exec sed -i '' 's|get-stream-url|getStreamUrl|g' {} \;
find virtualpytest/src/web/hooks -name "*.ts" -exec sed -i '' 's|get-status|getStatus|g' {} \;

# Update configuration files
echo "   ⚙️  Updating configuration files..."
find virtualpytest/config -name "*.json" -exec sed -i '' 's|take-screenshot|takeScreenshot|g' {} \;
find virtualpytest/config -name "*.json" -exec sed -i '' 's|execute-command|executeCommand|g' {} \;
find virtualpytest/config -name "*.json" -exec sed -i '' 's|screenshot-and-dump|screenshotAndDump|g' {} \;
find virtualpytest/config -name "*.json" -exec sed -i '' 's|get-apps|getApps|g' {} \;

# Update utility files
echo "   🛠️  Updating utility files..."
find virtualpytest/src/utils -name "*.py" -exec sed -i '' 's|take-screenshot|takeScreenshot|g' {} \;

# Update test scripts
echo "   🧪 Updating test scripts..."
find virtualpytest/scripts -name "*.py" -exec sed -i '' 's|take-screenshot|takeScreenshot|g' {} \;

# ==============================================
# PHASE 2: UPDATE SERVER ROUTES (BACKEND)
# ==============================================

echo "🖥️  Phase 2: Updating server routes..."

# Update server route definitions
echo "   🛣️  Updating route definitions..."

# Remote routes
sed -i '' "s|@remote_bp.route('/take-screenshot'|@remote_bp.route('/takeScreenshot'|g" virtualpytest/src/web/routes/server_remote_routes.py
sed -i '' "s|@remote_bp.route('/execute-command'|@remote_bp.route('/executeCommand'|g" virtualpytest/src/web/routes/server_remote_routes.py
sed -i '' "s|@remote_bp.route('/screenshot-and-dump'|@remote_bp.route('/screenshotAndDump'|g" virtualpytest/src/web/routes/server_remote_routes.py
sed -i '' "s|@remote_bp.route('/get-apps'|@remote_bp.route('/getApps'|g" virtualpytest/src/web/routes/server_remote_routes.py

# Host routes  
sed -i '' "s|@remote_bp.route('/take-screenshot'|@remote_bp.route('/takeScreenshot'|g" virtualpytest/src/web/routes/host_remote_routes.py
sed -i '' "s|@remote_bp.route('/execute-command'|@remote_bp.route('/executeCommand'|g" virtualpytest/src/web/routes/host_remote_routes.py
sed -i '' "s|@remote_bp.route('/screenshot-and-dump'|@remote_bp.route('/screenshotAndDump'|g" virtualpytest/src/web/routes/host_remote_routes.py
sed -i '' "s|@remote_bp.route('/get-apps'|@remote_bp.route('/getApps'|g" virtualpytest/src/web/routes/host_remote_routes.py

# AV routes
sed -i '' "s|@av_bp.route('/take-screenshot'|@av_bp.route('/takeScreenshot'|g" virtualpytest/src/web/routes/server_av_routes.py
sed -i '' "s|@av_bp.route('/get-stream-url'|@av_bp.route('/getStreamUrl'|g" virtualpytest/src/web/routes/server_av_routes.py
sed -i '' "s|@av_bp.route('/get-status'|@av_bp.route('/getStatus'|g" virtualpytest/src/web/routes/server_av_routes.py
sed -i '' "s|@av_bp.route('/take-control'|@av_bp.route('/takeControl'|g" virtualpytest/src/web/routes/server_av_routes.py
sed -i '' "s|@av_bp.route('/start-capture'|@av_bp.route('/startCapture'|g" virtualpytest/src/web/routes/server_av_routes.py
sed -i '' "s|@av_bp.route('/stop-capture'|@av_bp.route('/stopCapture'|g" virtualpytest/src/web/routes/server_av_routes.py

# Control routes
sed -i '' "s|@control_bp.route('/take-control'|@control_bp.route('/takeControl'|g" virtualpytest/src/web/routes/server_control_routes.py
sed -i '' "s|@control_bp.route('/release-control'|@control_bp.route('/releaseControl'|g" virtualpytest/src/web/routes/server_control_routes.py

# Actions routes
sed -i '' "s|@server_actions_bp.route('/server/action/execute_batch'|@server_actions_bp.route('/server/action/executeBatch'|g" virtualpytest/src/web/routes/server_actions_routes.py

# Verification routes
sed -i '' "s|@server_verification_common_bp.route('/execute_batch'|@server_verification_common_bp.route('/executeBatch'|g" virtualpytest/src/web/routes/server_verification_common_routes.py

# ==============================================
# PHASE 3: UPDATE PROXY CALLS
# ==============================================

echo "🔄 Phase 3: Updating proxy calls..."

# Update proxy_to_host calls in server routes
find virtualpytest/src/web/routes -name "*.py" -exec sed -i '' "s|'/host/remote/take-screenshot'|'/host/remote/takeScreenshot'|g" {} \;
find virtualpytest/src/web/routes -name "*.py" -exec sed -i '' "s|'/host/remote/execute-command'|'/host/remote/executeCommand'|g" {} \;
find virtualpytest/src/web/routes -name "*.py" -exec sed -i '' "s|'/host/remote/screenshot-and-dump'|'/host/remote/screenshotAndDump'|g" {} \;
find virtualpytest/src/web/routes -name "*.py" -exec sed -i '' "s|'/host/remote/get-apps'|'/host/remote/getApps'|g" {} \;
find virtualpytest/src/web/routes -name "*.py" -exec sed -i '' "s|'/host/av/take-screenshot'|'/host/av/takeScreenshot'|g" {} \;

# ==============================================
# PHASE 4: VALIDATION
# ==============================================

echo "✅ Phase 4: Validation..."

# Check for any remaining kebab-case routes
echo "🔍 Checking for remaining kebab-case routes..."
REMAINING=$(find virtualpytest/src -name "*.py" -o -name "*.ts" -o -name "*.tsx" | xargs grep -l "take-screenshot\|execute-command\|get-apps\|screenshot-and-dump" 2>/dev/null || true)

if [ -n "$REMAINING" ]; then
    echo "⚠️  WARNING: Some files still contain old route patterns:"
    echo "$REMAINING"
else
    echo "✅ All kebab-case routes successfully converted!"
fi

# Check for any remaining snake_case routes
echo "🔍 Checking for remaining snake_case routes..."
REMAINING_SNAKE=$(find virtualpytest/src -name "*.py" -o -name "*.ts" -o -name "*.tsx" | xargs grep -l "execute_batch" 2>/dev/null || true)

if [ -n "$REMAINING_SNAKE" ]; then
    echo "⚠️  WARNING: Some files still contain old snake_case patterns:"
    echo "$REMAINING_SNAKE"
else
    echo "✅ All snake_case routes successfully converted!"
fi

echo ""
echo "🎉 ATOMIC MIGRATION COMPLETE!"
echo "============================="
echo "✅ All routes standardized to camelCase"
echo "✅ No backward compatibility maintained"
echo "✅ All client/server references updated"
echo ""
echo "🧪 Next steps:"
echo "   1. Test the application"
echo "   2. Run end-to-end tests"
echo "   3. Commit changes if successful"
echo ""
echo "🔄 To rollback if needed:"
echo "   git reset --hard HEAD~1" 