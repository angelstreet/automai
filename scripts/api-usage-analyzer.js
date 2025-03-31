const fs = require('fs');
const path = require('path');

// Configuration
const API_ROUTES_DIR = 'src/app/api';
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
        if (!alternationRoute.referencePaths.includes(filePath)) {
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
 * Main analysis function
 * @param {string} srcDir - Source directory to scan
 * @param {string} apiRoutesDir - API routes directory to analyze
 */
function analyzeApiUsage(srcDir, apiRoutesDir) {
  console.log('Analyzing API route usage...');

  // Get all API routes
  const apiRoutes = getApiRoutes(apiRoutesDir);
  console.log(`Found ${apiRoutes.length} API routes.`);

  // Get all source files
  const sourceFiles = getAllFiles(srcDir);
  console.log(`Found ${sourceFiles.length} source files to analyze.`);

  // Check each file for references to API routes
  sourceFiles.forEach((filePath) => {
    // Skip the API files themselves
    if (filePath.includes(apiRoutesDir)) return;

    checkFileForApiReferences(filePath, apiRoutes);
  });

  // Sort API routes by number of references (ascending)
  apiRoutes.sort((a, b) => a.references - b.references);

  // Print results
  console.log('\n=== API Routes Analysis Results ===\n');

  const unusedRoutes = apiRoutes.filter((route) => route.references === 0);
  const rarelyUsedRoutes = apiRoutes.filter(
    (route) => route.references > 0 && route.references < 3,
  );
  const frequentlyUsedRoutes = apiRoutes.filter((route) => route.references >= 3);

  console.log(`Total API Routes: ${apiRoutes.length}`);
  console.log(`Unused Routes: ${unusedRoutes.length}`);
  console.log(`Rarely Used Routes (1-2 references): ${rarelyUsedRoutes.length}`);
  console.log(`Frequently Used Routes (3+ references): ${frequentlyUsedRoutes.length}`);

  if (unusedRoutes.length > 0) {
    console.log('\n=== Unused API Routes ===');
    unusedRoutes.forEach((route) => {
      console.log(`${route.route} (${route.path})`);
    });
  } else {
    console.log('\n=== Unused API Routes ===\nNone found.');
  }

  if (rarelyUsedRoutes.length > 0) {
    console.log('\n=== Rarely Used API Routes ===');
    rarelyUsedRoutes.forEach((route) => {
      console.log(`${route.route} (${route.path}) - ${route.references} references:`);
      route.referencePaths.forEach((refPath) => console.log(`  - ${refPath}`));
    });
  } else {
    console.log('\n=== Rarely Used API Routes ===\nNone found.');
  }

  if (frequentlyUsedRoutes.length > 0) {
    console.log('\n=== Frequently Used API Routes ===');
    frequentlyUsedRoutes.forEach((route) => {
      console.log(`${route.route} (${route.path}) - ${route.references} references`);
    });
  } else {
    console.log('\n=== Frequently Used API Routes ===\nNone found.');
  }
}

// Run the analysis
analyzeApiUsage(SRC_DIR, API_ROUTES_DIR);
