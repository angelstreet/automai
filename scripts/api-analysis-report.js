import fs from 'fs';
import path from 'path';

// Configuration
const API_ROUTES_DIR = 'src/app/api';
const ACTIONS_DIR = 'src/app/actions';
const SRC_DIR = 'src';
const EXCLUDE_DIRS = ['node_modules', '.next', 'dist', 'build'];
const OUTPUT_REPORT = 'api-analysis-report.md';

/**
 * Recursively scan a directory to find all files
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;

  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    if (EXCLUDE_DIRS.includes(file)) return;

    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      if (
        filePath.endsWith('.ts') ||
        filePath.endsWith('.tsx') ||
        filePath.endsWith('.js') ||
        filePath.endsWith('.jsx')
      ) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

/**
 * Get all API routes with detailed information
 */
function getApiRoutes(apiDir) {
  if (!fs.existsSync(apiDir)) {
    console.log(`API directory ${apiDir} does not exist.`);
    return [];
  }

  const apiRoutes = [];
  const apiFiles = getAllFiles(apiDir);

  apiFiles.forEach((filePath) => {
    if (filePath.endsWith('route.ts') || filePath.endsWith('route.js')) {
      const relativePath = path.relative(apiDir, filePath);
      const routeParts = relativePath.split(path.sep);

      // Remove route.ts/route.js from the end
      routeParts.pop();

      // Handle dynamic routes
      const route =
        '/' +
        routeParts
          .map((part) => {
            if (part.startsWith('[') && part.endsWith(']')) {
              return `:${part.slice(1, -1)}`;
            }
            return part;
          })
          .join('/');

      // Read file content to determine HTTP methods
      const content = fs.readFileSync(filePath, 'utf8');
      const methods = [];
      if (content.includes('export async function GET')) methods.push('GET');
      if (content.includes('export async function POST')) methods.push('POST');
      if (content.includes('export async function PUT')) methods.push('PUT');
      if (content.includes('export async function PATCH')) methods.push('PATCH');
      if (content.includes('export async function DELETE')) methods.push('DELETE');
      if (content.includes('export async function OPTIONS')) methods.push('OPTIONS');
      if (content.includes('export async function HEAD')) methods.push('HEAD');

      // Calculate complexity (simple metric based on lines of code)
      const lineCount = content.split('\n').length;
      const complexity = Math.min(10, Math.ceil(lineCount / 20)); // 1-10 scale

      // Get file stats
      const stats = fs.statSync(filePath);

      apiRoutes.push({
        path: filePath,
        relativePath,
        route,
        methods,
        references: 0,
        referencePaths: [],
        possibleReplacements: [],
        lastModified: stats.mtime,
        size: stats.size,
        complexity,
      });
    }
  });

  return apiRoutes;
}

/**
 * Check file for references to API routes
 */
function checkFileForApiReferences(filePath, apiRoutes) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    apiRoutes.forEach((apiRoute) => {
      // Check for literal route paths
      if (content.includes(`'${apiRoute.route}'`) || content.includes(`"${apiRoute.route}"`)) {
        apiRoute.references++;
        if (!apiRoute.referencePaths.includes(filePath)) {
          apiRoute.referencePaths.push(filePath);
        }
      }

      // Check for relative imports
      const relPathWithoutExt = apiRoute.relativePath.replace(/\.(ts|js)$/, '');
      if (
        content.includes(`from '${API_ROUTES_DIR}/${relPathWithoutExt}'`) ||
        content.includes(`from "${API_ROUTES_DIR}/${relPathWithoutExt}"`)
      ) {
        apiRoute.references++;
        if (!apiRoute.referencePaths.includes(filePath)) {
          apiRoute.referencePaths.push(filePath);
        }
      }

      // Check for fetch calls with API path
      if (
        content.includes(`fetch('${apiRoute.route}'`) ||
        content.includes(`fetch("${apiRoute.route}"`) ||
        content.includes(`fetch('/api${apiRoute.route}'`) ||
        content.includes(`fetch("/api${apiRoute.route}"`)
      ) {
        apiRoute.references++;
        if (!apiRoute.referencePaths.includes(filePath)) {
          apiRoute.referencePaths.push(filePath);
        }
      }

      // Check for API client calls (common patterns)
      if (
        content.includes(`api.get('${apiRoute.route}'`) ||
        content.includes(`api.get("${apiRoute.route}"`) ||
        content.includes(`api.post('${apiRoute.route}'`) ||
        content.includes(`api.post("${apiRoute.route}"`)
      ) {
        apiRoute.references++;
        if (!apiRoute.referencePaths.includes(filePath)) {
          apiRoute.referencePaths.push(filePath);
        }
      }
    });
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
  }
}

/**
 * Check file for references to server actions
 */
function checkFileForServerActionReferences(filePath, serverActions) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    serverActions.forEach((action) => {
      // Skip self-references
      if (filePath === action.path) return;

      // Check for imports of the action
      if (
        content.includes(`import { ${action.name} }`) ||
        content.includes(`import {${action.name}}`) ||
        content.includes(`import { ${action.name},`) ||
        content.includes(`import {${action.name},`)
      ) {
        action.references++;
        if (!action.referencePaths.includes(filePath)) {
          action.referencePaths.push(filePath);
        }
      }

      // Check for direct usage of the action
      if (content.includes(`${action.name}(`)) {
        action.references++;
        if (!action.referencePaths.includes(filePath)) {
          action.referencePaths.push(filePath);
        }
      }

      // Check for formAction references
      if (
        content.includes(`formAction={${action.name}}`) ||
        content.includes(`formAction={${action.name}.bind(`) ||
        content.includes(`formAction="${action.name}"`) ||
        content.includes(`formAction='${action.name}'`)
      ) {
        action.references++;
        if (!action.referencePaths.includes(filePath)) {
          action.referencePaths.push(filePath);
        }
      }
    });
  } catch (error) {
    console.error(`Error checking for server action references in ${filePath}:`, error);
  }
}

/**
 * Find similar server actions that could replace API routes
 */
function findPossibleReplacements(apiRoutes, serverActions) {
  apiRoutes.forEach((apiRoute) => {
    serverActions.forEach((action) => {
      // Skip if already added
      if (apiRoute.possibleReplacements.includes(action.name)) return;

      // Check if server action might be a replacement for API route
      const apiPurpose = inferApiPurpose(apiRoute);
      const actionPurpose = inferActionPurpose(action);

      const isSimilar =
        // Similar name
        action.name.toLowerCase().includes(apiRoute.route.replace(/\//g, '').toLowerCase()) ||
        apiRoute.route.replace(/\//g, '').toLowerCase().includes(action.name.toLowerCase()) ||
        // Similar purpose
        (apiPurpose && actionPurpose && apiPurpose === actionPurpose) ||
        // Similar database operations
        (action.functionBody.includes('supabase') && apiRoute.path.includes('supabase')) ||
        // Similar external API calls
        (action.functionBody.includes('fetch(') &&
          fs.readFileSync(apiRoute.path, 'utf8').includes('fetch('));

      if (isSimilar) {
        apiRoute.possibleReplacements.push(action.name);
        action.similarApis.push(apiRoute.route);
      }
    });
  });
}

/**
 * Infer the purpose of an API route based on its path and content
 */
function inferApiPurpose(apiRoute) {
  const fileName = path.basename(apiRoute.path);
  const pathSegments = apiRoute.route.split('/').filter(Boolean);
  const content = fs.readFileSync(apiRoute.path, 'utf8');

  // Check if it's a CRUD endpoint
  if (apiRoute.methods.includes('GET') && apiRoute.methods.includes('POST')) {
    if (pathSegments.length === 1) {
      return `${pathSegments[0]}-list`;
    }
    if (pathSegments.length > 1 && pathSegments[1].startsWith(':')) {
      return `${pathSegments[0]}-detail`;
    }
  }

  // Check for specific operations
  if (content.includes('auth')) return 'auth';
  if (content.includes('login') || content.includes('signin')) return 'login';
  if (content.includes('register') || content.includes('signup')) return 'signup';
  if (content.includes('upload') || content.includes('file')) return 'file-upload';
  if (content.includes('download')) return 'file-download';
  if (content.includes('webhook')) return 'webhook';

  return null;
}

/**
 * Infer the purpose of a server action based on its name and content
 */
function inferActionPurpose(action) {
  const name = action.name.toLowerCase();
  const content = action.functionBody.toLowerCase();

  // Check for CRUD operations
  if (name.includes('get') || name.includes('fetch') || name.includes('list')) {
    return `${name.replace('get', '').replace('fetch', '').replace('list', '')}-list`;
  }
  if (name.includes('create') || name.includes('add')) {
    return `${name.replace('create', '').replace('add', '')}-create`;
  }
  if (name.includes('update')) {
    return `${name.replace('update', '')}-update`;
  }
  if (name.includes('delete') || name.includes('remove')) {
    return `${name.replace('delete', '').replace('remove', '')}-delete`;
  }

  // Check for specific operations
  if (content.includes('auth')) return 'auth';
  if (content.includes('login') || content.includes('signin')) return 'login';
  if (content.includes('register') || content.includes('signup')) return 'signup';
  if (content.includes('upload') || content.includes('file')) return 'file-upload';
  if (content.includes('download')) return 'file-download';

  return null;
}

function getServerActions(actionsDir) {
  if (!fs.existsSync(actionsDir)) {
    console.log(`Actions directory ${actionsDir} does not exist.`);
    return [];
  }

  const serverActions = [];
  const actionFiles = getAllFiles(actionsDir);

  actionFiles.forEach((filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check if the file has the 'use server' directive
      const hasUseServer = content.includes("'use server'") || content.includes('"use server"');

      if (!hasUseServer) {
        return;
      }

      // Simple regex to find exported async functions
      const functionRegex =
        /export\s+(?:async\s+)?function\s+(\w+)|export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\(/g;
      let match;

      // Get file stats
      const stats = fs.statSync(filePath);

      while ((match = functionRegex.exec(content)) !== null) {
        const functionName = match[1] || match[2];

        // Extract function body
        const startIndex = match.index;
        let braceCount = 0;
        let bodyStartIndex = content.indexOf('{', startIndex);

        // For arrow functions
        if (bodyStartIndex === -1) {
          bodyStartIndex = content.indexOf('=>', startIndex);
          if (bodyStartIndex !== -1) {
            bodyStartIndex = content.indexOf('{', bodyStartIndex);
          }
        }

        if (bodyStartIndex !== -1) {
          let bodyEndIndex = bodyStartIndex;

          for (let i = bodyStartIndex; i < content.length; i++) {
            if (content[i] === '{') braceCount++;
            if (content[i] === '}') braceCount--;

            if (braceCount === 0) {
              bodyEndIndex = i + 1;
              break;
            }
          }

          const functionBody = content.substring(startIndex, bodyEndIndex);

          serverActions.push({
            path: filePath,
            name: functionName,
            functionBody,
            references: 0,
            referencePaths: [],
            similarApis: [],
            lastModified: stats.mtime,
            size: Buffer.from(functionBody).length,
          });
        }
      }
    } catch (error) {
      console.error(`Error extracting server actions from ${filePath}:`, error);
    }
  });

  return serverActions;
}

/**
 * Generate markdown report
 */
function generateReport(apiRoutes, serverActions) {
  const now = new Date();

  let report = `# API Routes Analysis Report\n\n`;
  report += `Generated on: ${now.toLocaleString()}\n\n`;

  // Summary
  report += `## Summary\n\n`;
  report += `- Total API Routes: ${apiRoutes.length}\n`;
  report += `- Unused API Routes: ${apiRoutes.filter((r) => r.references === 0).length}\n`;
  report += `- Rarely Used API Routes (1-2 references): ${apiRoutes.filter((r) => r.references > 0 && r.references < 3).length}\n`;
  report += `- Frequently Used API Routes (3+ references): ${apiRoutes.filter((r) => r.references >= 3).length}\n`;
  report += `- Total Server Actions: ${serverActions.length}\n`;
  report += `- Server - Server Actions that could replace API Routes: ${serverActions.filter((a) => a.similarApis.length > 0).length}\n\n`;

  // Unused API Routes
  report += `## Unused API Routes\n\n`;
  const unusedRoutes = apiRoutes.filter((r) => r.references === 0);

  if (unusedRoutes.length === 0) {
    report += `*No unused API routes found*\n\n`;
  } else {
    report += `These API routes have no references in the codebase and are candidates for removal:\n\n`;

    report += `| Route | File Path | HTTP Methods | Last Modified | Size (bytes) | Complexity |\n`;
    report += `|-------|-----------|--------------|---------------|--------------|------------|\n`;

    unusedRoutes.forEach((route) => {
      report += `| ${route.route} | ${route.path} | ${route.methods.join(', ')} | ${route.lastModified.toLocaleDateString()} | ${route.size} | ${route.complexity}/10 |\n`;
    });

    report += `\n`;
  }

  // Rarely Used API Routes
  report += `## Rarely Used API Routes (1-2 references)\n\n`;
  const rarelyUsedRoutes = apiRoutes.filter((r) => r.references > 0 && r.references < 3);

  if (rarelyUsedRoutes.length === 0) {
    report += `*No rarely used API routes found*\n\n`;
  } else {
    report += `These API routes have few references and might be candidates for consolidation:\n\n`;

    rarelyUsedRoutes.forEach((route) => {
      report += `### ${route.route} (${route.references} references)\n\n`;
      report += `- **File:** ${route.path}\n`;
      report += `- **HTTP Methods:** ${route.methods.join(', ')}\n`;
      report += `- **Last Modified:** ${route.lastModified.toLocaleDateString()}\n`;
      report += `- **Size:** ${route.size} bytes\n`;
      report += `- **Complexity:** ${route.complexity}/10\n\n`;

      report += `**Referenced in:**\n\n`;
      route.referencePaths.forEach((refPath) => {
        report += `- ${refPath}\n`;
      });

      if (route.possibleReplacements.length > 0) {
        report += `\n**Possible Server Action Replacements:**\n\n`;
        route.possibleReplacements.forEach((replacement) => {
          const action = serverActions.find((a) => a.name === replacement);
          if (action) {
            report += `- \`${replacement}\` in ${action.path}\n`;
          }
        });
      }

      report += `\n`;
    });
  }

  // Frequently Used API Routes
  report += `## Frequently Used API Routes (3+ references)\n\n`;
  const frequentlyUsedRoutes = apiRoutes.filter((r) => r.references >= 3);

  if (frequentlyUsedRoutes.length === 0) {
    report += `*No frequently used API routes found*\n\n`;
  } else {
    report += `These API routes are frequently used in the codebase:\n\n`;

    report += `| Route | File Path | HTTP Methods | References | Last Modified | Size (bytes) |\n`;
    report += `|-------|-----------|--------------|------------|---------------|------------|\n`;

    frequentlyUsedRoutes.forEach((route) => {
      report += `| ${route.route} | ${route.path} | ${route.methods.join(', ')} | ${route.references} | ${route.lastModified.toLocaleDateString()} | ${route.size} |\n`;
    });

    report += `\n`;
  }

  // Server Actions that could replace API Routes
  report += `## Server Actions that could replace API Routes\n\n`;
  const replacementActions = serverActions.filter((a) => a.similarApis.length > 0);

  if (replacementActions.length === 0) {
    report += `*No server actions found that could replace API routes*\n\n`;
  } else {
    report += `These server actions have similar functionality to existing API routes:\n\n`;

    replacementActions.forEach((action) => {
      report += `### ${action.name}\n\n`;
      report += `- **File:** ${action.path}\n`;
      report += `- **References:** ${action.references}\n`;
      report += `- **Last Modified:** ${action.lastModified.toLocaleDateString()}\n`;
      report += `- **Size:** ${action.size} bytes\n\n`;

      report += `**Could replace these API routes:**\n\n`;
      action.similarApis.forEach((apiRoute) => {
        const route = apiRoutes.find((r) => r.route === apiRoute);
        if (route) {
          report += `- ${apiRoute} (${route.references} references)\n`;
        }
      });

      report += `\n`;
    });
  }

  // Recommendations
  report += `## Recommendations\n\n`;

  if (unusedRoutes.length > 0) {
    report += `1. Consider removing or archiving these unused API routes:\n`;
    unusedRoutes.slice(0, Math.min(5, unusedRoutes.length)).forEach((route) => {
      report += `   - ${route.route} (${route.path})\n`;
    });
    if (unusedRoutes.length > 5) {
      report += `   - ...and ${unusedRoutes.length - 5} more\n`;
    }
    report += `\n`;
  }

  if (replacementActions.length > 0) {
    report += `2. Consider replacing these API routes with equivalent server actions:\n`;
    replacementActions.slice(0, Math.min(5, replacementActions.length)).forEach((action) => {
      const apiRoute = apiRoutes.find((r) => r.route === action.similarApis[0]);
      if (apiRoute) {
        report += `   - Replace ${apiRoute.route} with server action ${action.name}\n`;
      }
    });
    if (replacementActions.length > 5) {
      report += `   - ...and ${replacementActions.length - 5} more\n`;
    }
    report += `\n`;
  }

  report += `3. For any API routes you want to keep, consider adding more comprehensive documentation.\n\n`;

  report += `4. Update your client-side code to use server actions where appropriate, replacing fetch calls to API routes.\n\n`;

  report += `5. Consider implementing a migration strategy for transitioning from API routes to server actions over time.\n\n`;

  // Appendix with all API routes
  report += `## Appendix: All API Routes\n\n`;

  report += `| Route | HTTP Methods | References | Last Modified | Size | Complexity |\n`;
  report += `|-------|--------------|------------|---------------|------|------------|\n`;

  apiRoutes
    .sort((a, b) => a.route.localeCompare(b.route))
    .forEach((route) => {
      report += `| ${route.route} | ${route.methods.join(', ')} | ${route.references} | ${route.lastModified.toLocaleDateString()} | ${route.size} | ${route.complexity}/10 |\n`;
    });

  return report;
}

/**
 * Main analysis function
 */
function analyzeApi() {
  console.log('Starting API analysis...ア');

  // Get all API routes
  const apiRoutes = getApiRoutes(API_ROUTES_DIR);
  console.log(`Found ${apiRoutes.length} API routes.`);

  // Get all server actions
  const serverActions = getServerActions(ACTIONS_DIR);
  console.log(`Found ${serverActions.length} server actions.`);

  // Initialize similarApis arrays
  serverActions.forEach((action) => {
    action.similarApis = [];
  });

  // Get all source files
  const sourceFiles = getAllFiles(SRC_DIR);
  console.log(`Found ${sourceFiles.length} source files to analyze.`);

  // Check each file for references to API routes and server actions
  sourceFiles.forEach((filePath) => {
    // Skip the API files themselves
    if (!filePath.includes(API_ROUTES_DIR)) {
      checkFileForApiReferences(filePath, apiRoutes);
    }

    // Skip the action files themselves when checking for references
    if (!filePath.includes(ACTIONS_DIR)) {
      checkFileForServerActionReferences(filePath, serverActions);
    }
  });

  // Find possible replacements
  findPossibleReplacements(apiRoutes, serverActions);

  // Generate report
  const report = generateReport(apiRoutes, serverActions);
  fs.writeFileSync(OUTPUT_REPORT, report);

  console.log(`Analysis complete. Report saved to ${OUTPUT_REPORT}`);

  // Print summary
  console.log('\n=== API Analysis Summary ===\n');
  console.log(`Total API Routes: ${apiRoutes.length}`);
  console.log(`Unused API Routes: ${apiRoutes.filter((r) => r.references === 0).length}`);
  console.log(
    `Rarely Used API Routes (1-2 references): ${apiRoutes.filter((r) => r.references > 0 && r.references < 3).length}`,
  );
  console.log(
    `Frequently Used API Routes (3+ references): ${apiRoutes.filter((r) => r.references >= 3).length}`,
  );
  console.log(`Total Server Actions: ${serverActions.length}`);
  console.log(
    `Server Actions that could replace API Routes: ${serverActions.filter((a) => a.similarApis.length > 0).length}`,
  );
}

// Run the analysis
analyzeApi();
