// Test to verify the Supabase URL configuration
const hostname = 'vigilant-spork-q667vwj94c9x55.app.github.dev';
const codespacePart = hostname.split('.')[0];

console.log('Current hostname:', hostname);
console.log('Codespace name extracted:', codespacePart);

// Construct the Supabase URL using our algorithm
const supabaseUrl = `https://${codespacePart}-54321.app.github.dev`;
console.log('Constructed Supabase URL:', supabaseUrl);

// This is the URL that should be used in supabase-auth.ts and supabase.ts
console.log('This URL should match the one used in your Supabase configuration');
console.log('Make sure GitHub OAuth redirect URL in Supabase config.codespace.toml also uses this pattern');