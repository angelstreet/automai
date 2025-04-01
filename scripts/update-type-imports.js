/**
 * Type Import Migration Script
 * 
 * This script updates imports across the codebase to use the new type organization
 * structure with the suffixed naming convention. It handles different import styles
 * and performs direct replacements without backward compatibility.
 *
 * Usage:
 * node scripts/update-type-imports.js
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

// Define path mappings for import updates
const PATH_MAPPINGS = {
  // Component types (from core)
  '@/types/core/host': '@/types/component/hostComponentType',
  '@/types/core/repository': '@/types/component/repositoryComponentType',
  '@/types/core/deployment': '@/types/component/deploymentComponentType',
  '@/types/core/cicd': '@/types/component/cicdComponentType',
  '@/types/core/ssh': '@/types/component/sshComponentType',
  '@/types/core/scripts': '@/types/component/scriptsComponentType',
  '@/types/core/features': '@/types/component/featuresComponentType',
  
  // Service types (from auth)
  '@/types/auth/user': '@/types/service/userServiceType',
  '@/types/auth/session': '@/types/service/sessionServiceType',
  
  // Context types (from original to suffixed)
  '@/types/context/host': '@/types/context/hostContextType',
  '@/types/context/repository': '@/types/context/repositoryContextType',
  '@/types/context/deployment': '@/types/context/deploymentContextType',
  '@/types/context/cicd': '@/types/context/cicdContextType',
  '@/types/context/user': '@/types/context/userContextType',
  '@/types/context/sidebar': '@/types/context/sidebarContextType',
  '@/types/context/app': '@/types/context/appContextType',
  '@/types/context/dashboard': '@/types/context/dashboardContextType',
  '@/types/context/constants': '@/types/context/constantsContextType',
  '@/types/context/permissions': '@/types/context/permissionsContextType',
  '@/types/context/team': '@/types/context/teamContextType',
  
  // API types (from original to suffixed)
  '@/types/api/git/github': '@/types/api/githubApiType',
  '@/types/api/git/gitlab': '@/types/api/gitlabApiType',
  '@/types/api/git/common': '@/types/api/gitCommonApiType',
  
  // DB types (from original to suffixed)
  '@/types/db/supabase': '@/types/db/supabaseDbType',
  
  // Root level imports
  '@/types/user': '@/types/component/userComponentType',
  '@/types/sidebar': '@/types/context/sidebarContextType',
  '@/types/ssh': '@/types/component/sshComponentType',
  '@/types/scripts': '@/types/component/scriptsComponentType',
  '@/types/features': '@/types/component/featuresComponentType',
  '@/types/supabase': '@/types/db/supabaseDbType',
};

/**
 * Find all TypeScript files in the project
 */
async function findAllTsFiles() {
  try {
    const { stdout } = await exec('find src -type f -name "*.ts" -o -name "*.tsx"');
    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error finding TypeScript files:', error);
    return [];
  }
}

/**
 * Update imports in a single file
 */
function updateFileImports(filePath) {
  try {
    // Read file content
    let content = fs.readFileSync(filePath, 'utf8');
    let wasUpdated = false;

    // Process each old path mapping
    for (const [oldPath, newPath] of Object.entries(PATH_MAPPINGS)) {
      // Handle different import formats
      
      // Standard imports: import { X } from '@/types/core/host';
      const stdImportRegex = new RegExp(`import\\s+{([^}]+)}\\s+from\\s+['"]${oldPath.replace(/\//g, '\\/')}['"]`, 'g');
      if (stdImportRegex.test(content)) {
        content = content.replace(stdImportRegex, `import { $1 } from '${newPath}'`);
        wasUpdated = true;
      }
      
      // Type imports: import type { X } from '@/types/core/host';
      const typeImportRegex = new RegExp(`import\\s+type\\s+{([^}]+)}\\s+from\\s+['"]${oldPath.replace(/\//g, '\\/')}['"]`, 'g');
      if (typeImportRegex.test(content)) {
        content = content.replace(typeImportRegex, `import type { $1 } from '${newPath}'`);
        wasUpdated = true;
      }
      
      // Default imports: import X from '@/types/core/host';
      const defaultImportRegex = new RegExp(`import\\s+(\\w+)\\s+from\\s+['"]${oldPath.replace(/\//g, '\\/')}['"]`, 'g');
      if (defaultImportRegex.test(content)) {
        content = content.replace(defaultImportRegex, `import $1 from '${newPath}'`);
        wasUpdated = true;
      }
    }

    // Save updated content if changes were made
    if (wasUpdated) {
      fs.writeFileSync(filePath, content);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
}

/**
 * Main function to run the migration
 */
async function main() {
  console.log('🚀 Starting type import migration...');
  
  // Find all TypeScript files
  const files = await findAllTsFiles();
  console.log(`Found ${files.length} TypeScript files to process.`);
  
  // Update imports in each file
  let updatedFiles = 0;
  for (const file of files) {
    const updated = updateFileImports(file);
    if (updated) {
      console.log(`✓ Updated imports in ${file}`);
      updatedFiles++;
    }
  }
  
  console.log(`\n🎉 Migration completed! Updated ${updatedFiles} files.`);
}

// Run the script
main().catch(error => {
  console.error('Error running migration script:', error);
  process.exit(1);
});
