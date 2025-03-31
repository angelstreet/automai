/**
 * Script to help update type imports after reorganization
 *
 * Usage:
 * node scripts/update-type-imports.js
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Type mapping from old to new paths
const TYPE_MAPPINGS = {
  // Host types
  '@/types/context/host': {
    Host: '@/types/core/host',
    HostStatus: '@/types/core/host',
    HostConnectionType: '@/types/core/host',
    HostFormData: '@/types/core/host',
    HostConnectionStatus: '@/types/core/host',
    HostAnalytics: '@/types/core/host',
    VMConfig: '@/types/context/host-new',
    VMType: '@/types/context/host-new',
    HostData: '@/types/context/host-new',
    HostActions: '@/types/context/host-new',
    HostContextType: '@/types/context/host-new',
  },

  // Deployment types
  '@/types/context/deployment': {
    Host: '@/types/core/host',
    Repository: '@/types/core/deployment',
    LogEntry: '@/types/core/deployment',
    DeploymentScript: '@/types/core/deployment',
    DeploymentHost: '@/types/core/deployment',
    Deployment: '@/types/core/deployment',
    DeploymentStatus: '@/types/core/deployment',
    DeploymentFormData: '@/types/core/deployment',
    DeploymentConfig: '@/types/core/deployment',
    DeploymentData: '@/types/core/deployment',
    CICDProvider: '@/types/context/deployment-new',
    CICDJob: '@/types/context/deployment-new',
    DeploymentContextData: '@/types/context/deployment-new',
    DeploymentContextActions: '@/types/context/deployment-new',
    DeploymentContextType: '@/types/context/deployment-new',
  },

  // User types
  '@/types/user': {
    User: '@/types/auth/user',
    AuthUser: '@/types/auth/user',
    Role: '@/types/auth/user',
    UIRole: '@/types/auth/user',
    UserTeam: '@/types/auth/user',
    TeamMember: '@/types/auth/user',
    ResourceLimit: '@/types/auth/user',
    Tenant: '@/types/auth/session',
    AuthSession: '@/types/auth/session',
    SessionData: '@/types/auth/session',
    AuthResult: '@/types/auth/session',
    OAuthProvider: '@/types/auth/session',
    UserContextType: '@/types/context/user',
  },
};

// Regex patterns to find different import styles
const IMPORT_PATTERNS = [
  // Named imports: import { X, Y } from 'path';
  /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g,

  // Named imports with renamed: import { X as Z, Y } from 'path';
  /import\s+{\s*([^}]+)\s*}\s+from\s+['"]([^'"]+)['"]/g,

  // Default import: import X from 'path';
  /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,

  // Import type: import type { X, Y } from 'path';
  /import\s+type\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g,
];

async function findFilesWithImport(importPath) {
  try {
    const { stdout } = await execAsync(
      `grep -l "from '${importPath}'" --include="*.ts" --include="*.tsx" -r src/`,
    );
    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    if (error.code === 1) {
      // grep returns 1 when no matches found
      return [];
    }
    throw error;
  }
}

function updateImports(content, oldImportPath, typeMappings) {
  let updatedContent = content;

  // Find import statements with the old path
  const importRegex = new RegExp(
    `import\\s+(?:type\\s+)?{([^}]+)}\\s+from\\s+['"]${oldImportPath.replace('/', '\\/')}['"]`,
    'g',
  );

  // Replace with new imports
  updatedContent = updatedContent.replace(importRegex, (match, importedTypes) => {
    // Split the imported types
    const typesList = importedTypes.split(',').map((t) => t.trim());

    // Group by their new path
    const typesByNewPath = {};

    typesList.forEach((typeItem) => {
      // Handle "X as Y" renames
      const [rawType, alias] = typeItem.split(/\s+as\s+/).map((t) => t.trim());
      const type = rawType.trim();

      // Find the new path for this type
      const newPath = typeMappings[type] || oldImportPath;

      if (!typesByNewPath[newPath]) {
        typesByNewPath[newPath] = [];
      }

      typesByNewPath[newPath].push(alias ? `${type} as ${alias}` : type);
    });

    // Build the new import statements
    return Object.entries(typesByNewPath)
      .map(([newPath, types]) => `import { ${types.join(', ')} } from '${newPath}'`)
      .join(';\n');
  });

  return updatedContent;
}

async function processFile(filePath, oldImportPath, typeMappings) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const updatedContent = updateImports(content, oldImportPath, typeMappings);

    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent);
      console.log(`✅ Updated imports in ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error processing file ${filePath}:`, error);
    return false;
  }
}

async function main() {
  let totalFilesUpdated = 0;

  for (const [oldPath, typeMappings] of Object.entries(TYPE_MAPPINGS)) {
    console.log(`\nProcessing imports from ${oldPath}...`);

    // Find all files that import from this path
    const files = await findFilesWithImport(oldPath);
    console.log(`Found ${files.length} files with imports from ${oldPath}`);

    // Process each file
    let updatedCount = 0;
    for (const file of files) {
      const updated = await processFile(file, oldPath, typeMappings);
      if (updated) updatedCount++;
    }

    console.log(`Updated ${updatedCount} files for ${oldPath}`);
    totalFilesUpdated += updatedCount;
  }

  console.log(`\n🎉 Migration completed! Updated ${totalFilesUpdated} files total.`);
}

// Execute the main function
main().catch((error) => {
  console.error('Error running migration script:', error);
  process.exit(1);
});
