#!/bin/bash

# Script to switch between different Supabase configurations
# Usage: ./switch-supabase-config.sh [local|codespace|production]

CONFIG_TYPE=$1

if [ -z "$CONFIG_TYPE" ]; then
  echo "Error: Configuration type not specified"
  echo "Usage: ./switch-supabase-config.sh [local|codespace|production]"
  exit 1
fi

if [ "$CONFIG_TYPE" != "local" ] && [ "$CONFIG_TYPE" != "codespace" ] && [ "$CONFIG_TYPE" != "production" ]; then
  echo "Error: Invalid configuration type. Must be 'local', 'codespace', or 'production'"
  exit 1
fi

# Path to the Supabase config files
CONFIG_DIR="./supabase/config"
SOURCE_CONFIG="${CONFIG_DIR}/config.${CONFIG_TYPE}.toml"
TARGET_CONFIG="./supabase/config.toml"

# Check if source config exists
if [ ! -f "$SOURCE_CONFIG" ]; then
  echo "Error: Source configuration file not found: $SOURCE_CONFIG"
  exit 1
fi

# Copy the configuration file
echo "Switching to $CONFIG_TYPE Supabase configuration..."
cp "$SOURCE_CONFIG" "$TARGET_CONFIG"

if [ $? -eq 0 ]; then
  echo "Successfully switched to $CONFIG_TYPE configuration"
else
  echo "Error: Failed to switch configuration"
  exit 1
fi

exit 0
