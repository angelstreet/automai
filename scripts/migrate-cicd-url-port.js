/**
 * Migration script to separate URL and port in CICD providers
 *
 * This script updates existing CICD providers to use separate URL and port fields.
 */

const { createClient } = require('@supabase/supabase-js');

// Parse URL to extract port
function parseProviderUrl(fullUrl) {
  try {
    const urlObj = new URL(fullUrl);
    const port = urlObj.port ? parseInt(urlObj.port, 10) : null;

    // Remove port from URL
    urlObj.port = '';
    const url = urlObj.toString();

    return { url, port };
  } catch (error) {
    return { url: fullUrl, port: null };
  }
}

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Starting migration: Separating URL and port in CICD providers...');

  try {
    // Get all CICD providers
    const { data: providers, error } = await supabase.from('cicd_providers').select('*');

    if (error) {
      throw new Error(`Failed to fetch providers: ${error.message}`);
    }

    console.log(`Found ${providers.length} providers to process`);

    // Process each provider
    let successCount = 0;
    let errorCount = 0;

    for (const provider of providers) {
      try {
        console.log(`Processing provider ${provider.id} (${provider.name})...`);

        // Extract port from URL
        const { url, port } = parseProviderUrl(provider.url);

        // Update provider
        const { error: updateError } = await supabase
          .from('cicd_providers')
          .update({
            url,
            port,
            updated_at: new Date().toISOString(),
          })
          .eq('id', provider.id);

        if (updateError) {
          throw new Error(`Failed to update provider ${provider.id}: ${updateError.message}`);
        }

        console.log(`✅ Updated provider ${provider.id}: URL=${url}, Port=${port || 'none'}`);
        successCount++;
      } catch (providerError) {
        console.error(`❌ Error processing provider ${provider.id}: ${providerError.message}`);
        errorCount++;
      }
    }

    console.log('\nMigration complete:');
    console.log(`- Successfully processed: ${successCount} providers`);
    console.log(`- Errors: ${errorCount} providers`);
  } catch (error) {
    console.error(`Migration failed: ${error.message}`);
    process.exit(1);
  }
}

// Run migration
main()
  .then(() => {
    console.log('Migration finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error(`Migration failed: ${error.message}`);
    process.exit(1);
  });
