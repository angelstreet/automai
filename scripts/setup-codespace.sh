#!/bin/bash
# Setup Supabase in Codespace environment

echo "🚀 Setting up Codespace environment for Supabase"

# Make sure codespace environment variables are available
if [ -z "$CODESPACE_NAME" ] || [ -z "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN" ]; then
  echo "❌ Missing Codespace environment variables"
  echo "Please make sure CODESPACE_NAME and GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN are set"
  exit 1
fi

# Update the .env.codespace file with correct values
CODESPACE_URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
SUPABASE_URL="https://${CODESPACE_NAME}-54321.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"

echo "🔄 Updating .env.codespace with:"
echo "  - Site URL: $CODESPACE_URL"
echo "  - Supabase URL: $SUPABASE_URL"

# Update the environment file
sed -i "s|NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=${CODESPACE_URL}|g" .env.codespace
sed -i "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}|g" .env.codespace
sed -i "s|SUPABASE_AUTH_CALLBACK_URL=.*|SUPABASE_AUTH_CALLBACK_URL=${CODESPACE_URL}/api/auth/callback|g" .env.codespace
sed -i "s|GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN=.*|GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN=${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}|g" .env.codespace

# Switch to Codespace configuration
./scripts/switch-supabase-config.sh codespace

# Update Supabase configuration with correct URLs
REDIRECT_URLS=$(cat <<EOF
additional_redirect_urls = [
  "http://localhost:3000",
  "http://localhost:3000/auth-redirect",
  "http://localhost:3000/api/auth/callback",
  "http://localhost:3000/api/auth/callback/github",
  "http://localhost:3000/api/auth/callback/google",
  "http://localhost:3001",
  "http://localhost:3001/auth-redirect",
  "http://localhost:3001/api/auth/callback",
  "http://localhost:3001/api/auth/callback/github",
  "http://localhost:3001/api/auth/callback/google",
  "${CODESPACE_URL}",
  "${CODESPACE_URL}/auth-redirect",
  "${CODESPACE_URL}/api/auth/callback",
  "${CODESPACE_URL}/api/auth/callback/github",
  "${CODESPACE_URL}/api/auth/callback/google"
]
EOF
)

# Update site_url and redirect_urls in config.toml
sed -i "s|site_url = \".*\"|site_url = \"${CODESPACE_URL}\"|g" supabase/config.toml
sed -i "/additional_redirect_urls/,/]/ c\\$REDIRECT_URLS" supabase/config.toml

# Update OAuth provider redirect_uri
sed -i "s|redirect_uri = \".*\"|redirect_uri = \"${CODESPACE_URL}/api/auth/callback\"|g" supabase/config.toml

echo "✅ Environment setup complete"
echo "🔄 Restart Supabase to apply changes: npx supabase stop && npx supabase start"
echo "🚀 Then start the application: npm run dev:codespace"