#!/bin/bash
# Switch Supabase configuration based on environment

# Default to local if no argument is provided
ENV=${1:-local}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

CONFIG_PATH="$PROJECT_ROOT/supabase/config"
TARGET_CONFIG="$CONFIG_PATH/config.$ENV.toml"
CURRENT_CONFIG="$PROJECT_ROOT/supabase/config.toml"

# Check if target config exists
if [ ! -f "$TARGET_CONFIG" ]; then
  echo "❌ Configuration file for environment '$ENV' not found at: $TARGET_CONFIG"
  echo "Available configurations:"
  ls -1 "$CONFIG_PATH" | grep "config\." | sed 's/config\.\(.*\)\.toml/  \1/'
  exit 1
fi

# Backup current configuration if it's different
if [ -f "$CURRENT_CONFIG" ] && ! cmp -s "$CURRENT_CONFIG" "$TARGET_CONFIG"; then
  ENV_DETECT=$(grep -E "site_url.*github\.dev" "$CURRENT_CONFIG" > /dev/null && echo "codespace" || echo "local")
  cp "$CURRENT_CONFIG" "$CONFIG_PATH/config.$ENV_DETECT.toml"
  echo "💾 Backed up current configuration to: $CONFIG_PATH/config.$ENV_DETECT.toml"
fi

# Apply new configuration
cp "$TARGET_CONFIG" "$CURRENT_CONFIG"
echo "✅ Switched to $ENV Supabase configuration"

# Show configuration details
if [ "$ENV" = "codespace" ]; then
  SITE_URL=$(grep "site_url" "$CURRENT_CONFIG" | head -1 | sed 's/.*= "\(.*\)".*/\1/')
  GITHUB_CLIENT_ID=$(grep -A 3 "\[auth.external.github\]" "$CURRENT_CONFIG" | grep "client_id" | sed 's/.*= "\(.*\)".*/\1/')
  echo "🔍 Codespace Site URL: $SITE_URL"
  echo "🔑 GitHub Client ID: $GITHUB_CLIENT_ID"
fi

echo "To apply changes, restart Supabase with: npx supabase stop && npx supabase start"