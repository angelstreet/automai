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

      routeParts.pop();

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
      if (content.includes(`'${apiRoute.route}'`) || content.includes(`"${apiRoute.route}"`)) {
        apiRoute.references++;
        if (!apiRoute.referencePaths.includes(filePath)) {
          apiRoute.referencePaths.push(filePath);
        }
      }

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
 * Archive an API route by moving it
 * @param {Object} apiRoute - API route object to archive
 * @returns {boolean} Success status of the operation
 */
function archiveApiRoute(apiRoute) {
  try {
    if (!apiRoute?.path || !apiRoute?.relativePath || !apiRoute?.route) {
      throw new Error('Invalid API route object');
    }

    const targetDir = path.dirname(path.join(ARCHIVE_DIR, apiRoute.relativePath));
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(ARCHIVE_DIR, apiRoute.relativePath);

    if (!fs.existsSync(apiRoute.path)) {
      throw new Error(`Source file not found: ${apiRoute.path}`);
    }

    const content = fs.readFileSync(apiRoute.path, 'utf8');
    const archivedContent = `// ARCHIVED: This API route was moved on ${new Date().toISOString()}
// Original path: ${apiRoute.path}
// Route: ${apiRoute.route}
// This file is preserved for reference purposes only and is no longer in use.
// Last modified: ${fs.statSync(apiRoute.path).mtime.toISOString()}

${content}`;

    fs.writeFileSync(targetPath, archivedContent, { flag: 'wx' });
    fs.unlinkSync(apiRoute.path);

    console.log(`Successfully moved ${apiRoute.path} to ${targetPath}`);
    return true;
  } catch (error) {
    console.error(`Error moving API route ${apiRoute.path}:`, error.message);
    return false;
  }
}

/**
 * Delete an API route
 * @param {Object} apiRoute - API route object to delete
 */
function deleteApiRoute(apiRoute) {
  try {
    if (!fs.existsSync(apiRoute.path)) {
      throw new Error(`Source file not found: ${apiRoute.path}`);
    }
    fs.unlinkSync(apiRoute.path);
    console.log(`Deleted ${apiRoute.path}`);
  } catch (error) {
    console.error(`Error deleting API route ${apiRoute.path}:`, error);
  }
}

/**
 * Process cleanup of API routes
 */
function processApiCleanup() {
  console.log('Starting API cleanup process...');

  const apiRoutes = getApiRoutes(API_ROUTES_DIR);
  console.log(`Found ${apiRoutes.length} API routes.`);

  const sourceFiles = getAllFiles(SRC_DIR);
  console.log(`Found ${sourceFiles.length} source files to analyze.`);

  sourceFiles.forEach((filePath) => {
    if (filePath.includes(API_ROUTES_DIR)) return;
    checkFileForApiReferences(filePath, apiRoutes);
  });

  const unusedRoutes = apiRoutes.filter((route) => route.references === 0);
  console.log(`Found ${unusedRoutes.length} unused API routes.`);

  if (unusedRoutes.length === 0) {
    console.log('\nNo unused API routes found.');
    return;
  }

  console.log('\nThe following API routes appear to be unused:');
  unusedRoutes.forEach((route, index) => {
    console.log(`${index + 1}. ${route.route} (${route.path})`);
  });

  const shouldArchive = process.argv.includes('--archive');
  const shouldDelete = process.argv.includes('--delete');

  if (!shouldArchive && !shouldDelete) {
    console.log('\nTo archive these routes, run:');
    console.log('node api-cleanup-helper.js --archive');
    console.log('To delete these routes without archiving, run:');
    console.log('node api-cleanup-helper.js --delete');
    return;
  }

  if (shouldArchive) {
    console.log('\nMoving unused API routes to archive...');
    if (!fs.existsSync(ARCHIVE_DIR)) {
      fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }
    unusedRoutes.forEach((route) => archiveApiRoute(route));
    console.log(`\nMoved ${unusedRoutes.length} unused API routes to ${ARCHIVE_DIR}`);
  }

  if (shouldDelete) {
    console.log('\nDeleting unused API routes...');
    unusedRoutes.forEach((route) => deleteApiRoute(route));
    console.log(`\nDeleted ${unusedRoutes.length} unused API routes`);
  }
}

processApiCleanup();
