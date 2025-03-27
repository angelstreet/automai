// Simple test script for getCICDProviders function
// Run with: node -r dotenv/config test-cicd-provider.js

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getCICDProviders(where = {}) {
  try {
    console.log('Test: Getting all CI/CD providers');

    // Build query
    let query = supabase.from('cicd_providers').select('*');

    // Add tenant filter if provided
    if (where?.tenant_id) {
      query = query.eq('tenant_id', where.tenant_id);
    }

    // Log the constructed query
    console.log('Executing query on cicd_providers with tenant_id:', where?.tenant_id);

    // Execute query
    const { data: providers, error } = await query;

    if (error) {
      console.error('Test: Error getting CI/CD providers:', error);
      return { success: false, error: error.message };
    }

    console.log('Test: Retrieved CI/CD providers count:', providers?.length || 0);
    console.log('Test: Retrieved CI/CD providers:', JSON.stringify(providers, null, 2));

    return {
      success: true,
      data: providers,
    };
  } catch (error) {
    console.error('Test: Unexpected error getting CI/CD providers:', error);
    return { success: false, error: error.message };
  }
}

// Test the function
async function runTest() {
  // Test getting all providers
  console.log('\n--- Test 1: Get all providers ---');
  const result1 = await getCICDProviders();
  console.log('Success:', result1.success);
  
  // Test with tenant filter - use the tenant_id from the previous query
  if (result1.success && result1.data && result1.data.length > 0) {
    const tenantId = result1.data[0].tenant_id;
    console.log('\n--- Test 2: Get providers for tenant_id:', tenantId, '---');
    const result2 = await getCICDProviders({ tenant_id: tenantId });
    console.log('Success:', result2.success);
  }
  
  // Test with non-existent tenant
  console.log('\n--- Test 3: Get providers for non-existent tenant ---');
  const result3 = await getCICDProviders({ tenant_id: 'non-existent-tenant' });
  console.log('Success:', result3.success);
  console.log('Providers found:', result3.data?.length || 0);
}

runTest(); 