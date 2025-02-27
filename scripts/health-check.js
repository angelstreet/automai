#!/usr/bin/env node

/**
 * Health Check Script
 * 
 * This script checks the codebase for files that exceed the 300-line limit
 * and provides recommendations for breaking them up according to best practices.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const MAX_LINES = 300;
const IGNORED_DIRS = [
  'node_modules',
  '.next',
  '.git',
  'prisma/migrations',
  'scripts'
];
const IGNORED_FILES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml'
];
const IGNORED_EXTENSIONS = [
  '.md',
  '.json',
  '.lock',
  '.svg',
  '.ico',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  '.env.test'
];

// Special cases - modules and shadcn components are allowed to exceed the limit
const EXEMPTED_PATTERNS = [
  /^src\/lib\/modules\//,
  /^src\/components\/ui\//,
  /node_modules/,
  /^prisma\/migrations\//,
  /\.d\.ts$/,
  /\.test\./,
  /\.spec\./,
  /\.config\./
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Get all files in the project
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // Skip ignored directories
    if (stat.isDirectory()) {
      if (!IGNORED_DIRS.includes(file)) {
        getAllFiles(filePath, fileList);
      }
      return;
    }
    
    // Skip ignored files and extensions
    const ext = path.extname(file);
    if (IGNORED_FILES.includes(file) || IGNORED_EXTENSIONS.includes(ext)) {
      return;
    }
    
    fileList.push(filePath);
  });
  
  return fileList;
}

// Check if a file is exempted from the line limit
function isExempted(filePath) {
  return EXEMPTED_PATTERNS.some(pattern => pattern.test(filePath));
}

// Count lines in a file
function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.split('\n').length;
}

// Analyze file type and provide specific recommendations
function analyzeFile(filePath, lineCount) {
  const ext = path.extname(filePath);
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);
  
  console.log(`${colors.red}File exceeds ${MAX_LINES} lines:${colors.reset} ${filePath} (${lineCount} lines)`);
  
  // Determine file type and provide specific recommendations
  if (ext === '.tsx' || ext === '.jsx') {
    if (filePath.includes('/components/')) {
      console.log(`${colors.yellow}Recommendation for component:${colors.reset}`);
      console.log('1. Extract subcomponents to separate files:');
      console.log(`   - Create a directory: ${dirName}/${fileName.replace(ext, '')}/`);
      console.log(`   - Main component: ${dirName}/${fileName.replace(ext, '')}/index${ext}`);
      console.log(`   - Subcomponents: ${dirName}/${fileName.replace(ext, '')}/SubComponentName${ext}`);
      console.log('2. Move complex logic to custom hooks:');
      console.log(`   - Create: ${dirName}/hooks/use${fileName.replace(ext, '')}State.ts`);
    } else if (filePath.includes('/app/')) {
      console.log(`${colors.yellow}Recommendation for page:${colors.reset}`);
      console.log('1. Extract page sections to components:');
      console.log(`   - Create: ${dirName}/_components/SectionName${ext}`);
      console.log('2. Move data fetching to separate files:');
      console.log(`   - Create: ${dirName}/actions.ts or ${dirName}/api.ts`);
    }
  } else if (ext === '.ts' || ext === '.js') {
    if (filePath.includes('/hooks/')) {
      console.log(`${colors.yellow}Recommendation for hook file:${colors.reset}`);
      console.log('1. Split by functionality:');
      console.log(`   - Create separate hook files for different concerns`);
      console.log(`   - Follow the pattern: use[Feature][Action].ts`);
      console.log('2. Organize hook internals:');
      console.log(`   - State declarations first`);
      console.log(`   - Derived state next`);
      console.log(`   - Event handlers next`);
      console.log(`   - Effects last`);
    } else if (filePath.includes('/lib/') || filePath.includes('/utils/')) {
      console.log(`${colors.yellow}Recommendation for utility file:${colors.reset}`);
      console.log('1. Split by functionality:');
      console.log(`   - Create: ${dirName}/${fileName.replace(ext, '')}/index${ext}`);
      console.log(`   - Split into: ${dirName}/${fileName.replace(ext, '')}/specificFunction${ext}`);
    } else if (filePath.includes('/api/')) {
      console.log(`${colors.yellow}Recommendation for API route:${colors.reset}`);
      console.log('1. Extract validation logic:');
      console.log(`   - Create: ${dirName}/validation${ext}`);
      console.log('2. Move business logic to service layer:');
      console.log(`   - Create: src/lib/services/${path.basename(dirName)}Service${ext}`);
    } else if (filePath.includes('/constants/') || fileName.includes('constants')) {
      console.log(`${colors.yellow}Recommendation for constants file:${colors.reset}`);
      console.log('1. Group constants by domain:');
      console.log(`   - Split into separate files by feature or domain`);
      console.log(`   - Use index.ts to re-export all constants`);
    }
  }
  
  console.log(''); // Empty line for readability
}

// Print best practices for breaking up large files
function printBestPractices() {
  console.log(`
${colors.magenta}For detailed refactoring guidelines, see:${colors.reset}
   ${colors.cyan}.cursor/rules/refactoring.mdc${colors.reset}

${colors.magenta}Key points to remember:${colors.reset}
   - Refactor ONE file at a time
   - Test thoroughly after each file refactor
   - Get explicit agreement before moving to the next file
   - Document all changes made during refactoring
`);
}

// Main function
function main() {
  console.log(`${colors.cyan}=== Health Check: File Size Analysis ===${colors.reset}\n`);
  
  try {
    // Get the project root directory
    const rootDir = execSync('git rev-parse --show-toplevel').toString().trim();
    
    // If not in a git repository, use the current directory
    const projectDir = rootDir || process.cwd();
    
    console.log(`${colors.blue}Scanning directory:${colors.reset} ${projectDir}\n`);
    
    // Get all files
    const files = getAllFiles(projectDir);
    
    // Check each file
    let oversizedFiles = 0;
    let totalFiles = 0;
    
    files.forEach(file => {
      // Skip exempted files
      if (isExempted(file)) {
        return;
      }
      
      totalFiles++;
      const lineCount = countLines(file);
      
      if (lineCount > MAX_LINES) {
        oversizedFiles++;
        analyzeFile(file, lineCount);
      }
    });
    
    // Summary
    console.log(`${colors.cyan}=== Summary ===${colors.reset}`);
    console.log(`Total files scanned: ${totalFiles}`);
    
    if (oversizedFiles === 0) {
      console.log(`${colors.green}All files are within the ${MAX_LINES}-line limit. Great job!${colors.reset}`);
    } else {
      console.log(`${colors.red}Files exceeding ${MAX_LINES} lines: ${oversizedFiles}${colors.reset}`);
      console.log(`\n${colors.cyan}=== Refactoring Guidelines ===${colors.reset}`);
      printBestPractices();
      
      console.log(`\n${colors.yellow}=== IMPORTANT: Refactoring Safety Guidelines ===${colors.reset}`);
      console.log(`${colors.yellow}1. Refactor ONE file at a time${colors.reset}`);
      console.log(`${colors.yellow}2. Test thoroughly after each file refactor${colors.reset}`);
      console.log(`${colors.yellow}3. Get explicit agreement before moving to the next file${colors.reset}`);
      console.log(`${colors.yellow}4. Document all changes made during refactoring${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run the script
main(); 