import fs from 'fs';
import path from 'path';

// Configuration
const API_ROUTES_DIR = 'src/app/api';
const ARCHIVE_DIR = 'src/_archived/api';
const SRC_DIR = 'src';
const EXCLUDE_DIRS = ['node_modules', '.next', 'dist', 'build'];

/**
 * Recursively scan a directory to find all files
 * @param {string} dirPath - Directory to scan
 * @param {string[]} [arrayOfFiles] - Accumulated file paths
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
 * Get all API routes
 * @param {string} apiDir - API directory to scan
 * @returns {Object[]} Array of API route objects
 */
function getApiRoutes(apiDir) {
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

      apiRoutes.push({
        path: filePath,
        relativePath,
        route,
        references: 0,
        referencePaths: [],
      });
    }
  });

  return apiRoutes;
}

/**
 * Check file for references to API routes
 * @param {string} filePath - File to check
 * @param {Object[]} apiRoutes - Array of API route objects
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
 * Archive an API route
 * @param {Object} apiRoute - API route object to archive
 */
function archiveApiRoute(apiRoute) {
  try {
    // Create archive directory structure
    const targetDir = path.dirname(path.join(ARCHIVE_DIR, apiRoute.relativePath));
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(ARCHIVE_DIR, apiRoute.relativePath);

    // Read the file
    const content = fs.readFileSync(apiRoute.path, 'utf8');

    // Add an archived comment at the top
    const archivedContent = `// ARCHIVED: This API route was archived on ${new Date().toISOString()}
// Original path: ${apiRoute.path}
// Route: ${apiRoute.route}
// This file is preserved for reference purposes only and is no longer in use.

${content}`;

    // Write to archive location
    fs.writeFileSync(targetPath, archivedContent);

    console.log(`Archived ${apiRoute.path} to ${targetPath}`);
  } catch (error) {
    console.error(`Error archiving API route ${apiRoute.path}:`, error);
  }
}

/**
 * Process cleanup of API routes
 */
function processApiCleanup() {
  console.log('Starting API cleanup process...');

  // Get all API routes
  const apiRoutes = getApiRoutes(API_ROUTES_DIR);
  console.log(`Found ${apiRoutes.length} API routes.`);

  // Get all source files
  const sourceFiles = getAllFiles(SRC_DIR);
  console.log(`Found ${sourceFiles.length} source files to analyze.`);

  // Check each file for references to API routes
  sourceFiles.forEach((filePath) => {
    // Skip the API files themselves
    if (filePath.includes(API_ROUTES_DIR)) return;

    checkFileForApiReferences(filePath, apiRoutes);
  });

  // Filter out unused routes
  const unusedRoutes = apiRoutes.filter((route) => route.references === 0);
  console.log(`Found ${unusedRoutes.length} unused API routes.`);

  if (unusedRoutes.length === 0) {
    console.log('\nNo unused API routes found.');
    return;
  }

  // Prompt for confirmation
  console.log('\nThe following API routes appear to be unused:');
  unusedRoutes.forEach((route, index) => {
    console.log(`${index + 1}. ${route.route} (${route.path})`);
  });

  console.log('\nTo archive these routes, run:');
  console.log('node api-cleanup-helper.js --archive');

  // Check if --archive flag was passed
  if (process.argv.includes('--archive')) {
    console.log('\nArchiving unused API routes...');

    // Create archive directory if it doesn't exist
    if (!fs.existsSync(ARCHIVE_DIR)) {
      fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }

    // Archive each unused route
    unusedRoutes.forEach((route) => {
      archiveApiRoute(route);
    });

    console.log(`\nArchived ${unusedRoutes.length} unused API routes to ${ARCHIVE_DIR}`);
    console.log(
      'Original files were preserved. To delete them, manually remove or modify this script to include deletion.',
    );
  }
}

// Run the cleanup process
processApiCleanup();
