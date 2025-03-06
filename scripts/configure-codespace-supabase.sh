#!/bin/bash
# Configure Supabase for GitHub Codespace environment

# Read variables from .env.codespace
if [ -f .env.codespace ]; then
  export $(grep -v '^#' .env.codespace | xargs)
fi

CODESPACE_URL="https://$CODESPACE_NAME.$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN"
echo "=€ Configuring Supabase for Codespace URL: $CODESPACE_URL"

# Check if the necessary environment variables are set
if [ -z "$CODESPACE_NAME" ] || [ -z "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN" ]; then
  echo "L Codespace environment variables not set in .env.codespace"
  exit 1
fi

# Update Supabase config.toml
echo "=Ý Updating Supabase site_url to: $CODESPACE_URL"
sed -i "s|site_url = \"http://localhost:3000\"|site_url = \"$CODESPACE_URL\"|g" supabase/config.toml

# Add Codespace redirect URLs
echo "=Ý Adding Codespace redirect URLs to Supabase config"
REDIRECT_URLS=$(cat <<EOF
additional_redirect_urls = [
  "http://localhost:3000",
  "http://localhost:3000/auth-redirect",
  "http://localhost:3000/api/auth/callback",
  "http://localhost:3000/api/auth/callback/github",
  "http://localhost:3000/api/auth/callback/google",
  "$CODESPACE_URL",
  "$CODESPACE_URL/auth-redirect",
  "$CODESPACE_URL/api/auth/callback",
  "$CODESPACE_URL/api/auth/callback/github",
  "$CODESPACE_URL/api/auth/callback/google"
]
EOF
)

# Replace the redirect_urls section in the config.toml
sed -i "/additional_redirect_urls/,/]/ c\\$REDIRECT_URLS" supabase/config.toml

# Update OAuth providers
echo "=Ý Updating OAuth providers redirect_uri in Supabase config"
sed -i "s|redirect_uri = \"http://localhost:3000/api/auth/callback\"|redirect_uri = \"$CODESPACE_URL/api/auth/callback\"|g" supabase/config.toml

echo " Supabase configuration updated for Codespace"
echo "= Now restart Supabase with: npx supabase stop && npx supabase start"