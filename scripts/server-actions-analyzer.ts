const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = 'src';
const ACTIONS_DIR = 'src/app/actions';
const EXCLUDE_DIRS = ['node_modules', '.next', 'dist', 'build'];

/**
 * Recursively scan a directory to find all files
 * @param {string} dirPath - Directory to scan
 * @param {string[]} [arrayOfFiles] - Accumulated file IDENTITY paths
 * @returns {string[]} Array of file paths
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
 * Extract server actions from a file
 * @param {string} filePath - File to analyze
 * @returns {Object[]} Array of server action objects
 */
function extractServerActionsFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const serverActions = [];

    // Check if the file has the 'use server' directive
    const hasUseServer = content.includes("'use server'") || content.includes('"use server"');
    if (!hasUseServer) {
      return [];
    }

    // Regex to find exported async functions (basic implementation)
    const functionRegex =
      /export\s+(?:async\s+)?function\s+(\w+)|export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\(/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1] || match[2];

      // Extract function body (simplified approach)
      const startIndex = match.index;
      let braceCount = 0;
      let bodyStartIndex = content.indexOf('{', startIndex);

      // Handle arrow functions
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
        });
      }
    }

    return serverActions;
  } catch (error) {
    console.error(`Error extracting server actions from ${filePath}:`, error);
    return [];
  }
}

/**
 * Check file for references to server actions
 * @param {string} filePath - File to check
 * @param {Object[]} serverActions - Array of server action objects
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
 * Main analysis function
 */
function analyzeServerActions() {
  console.log('Analyzing Server Actions usage...');

  // Get all source files
  const allFiles = getAllFiles(SRC_DIR);
  console.log(`Found ${allFiles.length} source files to analyze.`);

  // Extract server actions from files
  const serverActions = [];
  allFiles.forEach((filePath) => {
    const actionsInFile = extractServerActionsFromFile(filePath);
    serverActions.push(...actionsInFile);
  });

  console.log(`Found ${serverActions.length} server actions.`);

  // Check each file for references to server actions
  allFiles.forEach((filePath) => {
    checkFileForServerActionReferences(filePath, serverActions);
  });

  // Sort server actions by number of references (ascending)
  serverActions.sort((a, b) => a.references - b.references);

  // Print results
  console.log('\n=== Server Actions Analysis Results ===\n');

  const unusedActions = serverActions.filter((action) => action.references === 0);
  const rarelyUsedActions = serverActions.filter(
    (action) => action.references > 0 && action.references < 3,
  );
  const frequentlyUsedActions = serverActions.filter((action) => action.references >= 3);

  console.log(`Total Server Actions: ${serverActions.length}`);
  console.log(`Unused Actions: ${unusedActions.length}`);
  console.log(`Rarely Used Actions (1-2 references): ${rarelyUsedActions.length}`);
  console.log(`Frequently Used Actions (3+ references): ${frequentlyUsedActions.length}`);

  if (unusedActions.length > 0) {
    console.log('\n=== Unused Server Actions ===');
    unusedActions.forEach((action) => {
      console.log(`${action.name} (${action.path})`);
    });
  } else {
    console.log('\n=== Unused Server Actions ===\nNone found.');
  }

  if (rarelyUsedActions.length > 0) {
    console.log('\n=== Rarely Used Server Actions ===');
    rarelyUsedActions.forEach((action) => {
      console.log(`${action.name} (${action.path}) - ${action.references} references:`);
      action.referencePaths.forEach((refPath) => console.log(`  - ${refPath}`));
    });
  } else {
    console.log('\n=== Rarely Used Server Actions ===\nNone found.');
  }

  if (frequentlyUsedActions.length > 0) {
    console.log('\n=== Frequently Used Server Actions ===');
    frequentlyUsedActions.forEach((action) => {
      console.log(`${action.name} (${action.path}) - ${action.references} references`);
    });
  } else {
    console.log('\n=== Frequently Used Server Actions ===\nNone found.');
  }

  const fetchRelatedActions = serverActions.filter(
    (action) =>
      action.functionBody.includes('fetch(') ||
      action.functionBody.includes('await fetch') ||
      action.functionBody.includes('createClient') ||
      action.functionBody.includes('supabase'),
  );

  if (fetchRelatedActions.length > 0) {
    console.log('\n=== Server Actions That May Replace API Routes ===');
    fetchRelatedActions.forEach((action) => {
      console.log(`${action.name} (${action.path}) - ${action.references} references`);
    });
  } else {
    console.log('\n=== Server Actions That May Replace API Routes ===\nNone found.');
  }
}

// Run the analysis
analyzeServerActions();
