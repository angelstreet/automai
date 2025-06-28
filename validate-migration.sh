#!/bin/bash

echo "🧪 ROUTE MIGRATION VALIDATION SCRIPT"
echo "===================================="

# Test critical endpoints
CRITICAL_ROUTES=(
    "/server/remote/takeScreenshot"
    "/server/remote/executeCommand"
    "/server/remote/getApps"
    "/server/remote/screenshotAndDump"
    "/server/action/executeBatch"
    "/server/verification/executeBatch"
    "/server/av/takeScreenshot"
    "/server/control/takeControl"
    "/server/control/releaseControl"
)

echo "🔍 Testing critical route endpoints..."

# Function to test if route exists in code
test_route_exists() {
    local route=$1
    local found=$(find virtualpytest/src/web/routes -name "*.py" | xargs grep -l "@.*route('$route'" 2>/dev/null)
    
    if [ -n "$found" ]; then
        echo "✅ Route $route found in: $(basename $found)"
        return 0
    else
        echo "❌ Route $route NOT FOUND"
        return 1
    fi
}

# Test each critical route
failed_routes=0
for route in "${CRITICAL_ROUTES[@]}"; do
    if ! test_route_exists "$route"; then
        ((failed_routes++))
    fi
done

echo ""
echo "📊 VALIDATION RESULTS"
echo "===================="

if [ $failed_routes -eq 0 ]; then
    echo "✅ ALL CRITICAL ROUTES VALIDATED SUCCESSFULLY"
    echo "🎉 Migration appears to be successful!"
else
    echo "❌ $failed_routes CRITICAL ROUTES FAILED VALIDATION"
    echo "⚠️  Migration may have issues - manual review required"
fi

# Check for any remaining old patterns
echo ""
echo "🔍 Checking for remaining old patterns..."

OLD_PATTERNS=(
    "take-screenshot"
    "execute-command"
    "get-apps"
    "screenshot-and-dump"
    "execute_batch"
    "take-control"
    "release-control"
)

remaining_issues=0
for pattern in "${OLD_PATTERNS[@]}"; do
    found=$(find virtualpytest/src -name "*.py" -o -name "*.ts" -o -name "*.tsx" | xargs grep -l "$pattern" 2>/dev/null || true)
    if [ -n "$found" ]; then
        echo "⚠️  Old pattern '$pattern' still found in:"
        echo "$found" | sed 's/^/   /'
        ((remaining_issues++))
    fi
done

if [ $remaining_issues -eq 0 ]; then
    echo "✅ No old patterns found - clean migration!"
else
    echo "⚠️  $remaining_issues old patterns still exist - manual cleanup needed"
fi

echo ""
echo "🎯 FINAL VALIDATION STATUS"
echo "=========================="

if [ $failed_routes -eq 0 ] && [ $remaining_issues -eq 0 ]; then
    echo "🟢 MIGRATION SUCCESSFUL - Ready for testing!"
    exit 0
else
    echo "🟡 MIGRATION INCOMPLETE - Manual review required"
    exit 1
fi 