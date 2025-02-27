#!/usr/bin/env node

/**
 * Refactor Scanner Script
 * 
 * This script scans the codebase for files to analyze for refactoring.
 * It respects the refactorignore file in scripts/refactor directory for directories and files to ignore.
 * 
 * Usage:
 *   node scripts/refactor/refactor-scanner.js [--scope=<scope>]
 * 
 * Scope:
 *   --scope=all        : Scan all files in the src directory (default)
 *   --scope=components : Only scan the components directory
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let scope = 'all';

args.forEach(arg => {
  if (arg.startsWith('--scope=')) {
    scope = arg.split('=')[1];
  }
});

// Validate input arguments
const validScopes = ['all', 'components'];
if (!validScopes.includes(scope)) {
  console.log(`Warning: Invalid scope '${scope}'. Using default 'all'.`);
  scope = 'all';
}

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

// Load ignored directories and files from refactorignore
function loadIgnoredPatterns() {
  const ignoredDirs = ['node_modules', '.next', '.git', 'prisma/migrations', 'scripts'];
  const ignoredFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
  const ignoredExtensions = ['.md', '.json', '.lock', '.svg', '.ico', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.env', '.env.local', '.env.development', '.env.production', '.env.test'];
  const exemptedPatterns = [];
  
  try {
    const ignoreFilePath = path.join(__dirname, 'refactorignore');
    if (fs.existsSync(ignoreFilePath)) {
      const ignoreContent = fs.readFileSync(ignoreFilePath, 'utf8');
      const lines = ignoreContent.split('\n');
      
      lines.forEach(line => {
        // Skip empty lines and comments
        if (!line.trim() || line.trim().startsWith('#')) {
          return;
        }
        
        // Check if it's a RegExp pattern
        if (line.trim().startsWith('/')) {
          exemptedPatterns.push(line.trim());
          return;
        }
        
        // Check if it's a file extension
        if (line.trim().startsWith('*.')) {
          ignoredExtensions.push(line.trim().substring(1)); // Remove the *
          return;
        }
        
        // Check if it's a directory or file
        if (line.trim().endsWith('/')) {
          ignoredDirs.push(line.trim().slice(0, -1)); // Remove the trailing slash
        } else {
          ignoredFiles.push(line.trim());
        }
      });
    }
  } catch (error) {
    console.error(`Error loading refactorignore from ${path.join(__dirname, 'refactorignore')}: ${error.message}`);
  }
  
  return { ignoredDirs, ignoredFiles, ignoredExtensions, exemptedPatterns };
}

// Get all files in the project
function getAllFiles(dir, fileList = [], ignoredPatterns) {
  const { ignoredDirs, ignoredFiles, ignoredExtensions } = ignoredPatterns;
  
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(filePath);
        
        // Skip ignored directories
        if (stat.isDirectory()) {
          // Check if directory should be ignored
          if (ignoredDirs.some(ignored => filePath.includes(`/${ignored}`))) {
            return;
          }
          getAllFiles(filePath, fileList, ignoredPatterns);
          return;
        }
        
        // Skip ignored files and extensions
        const ext = path.extname(file);
        if (ignoredFiles.includes(file) || ignoredExtensions.includes(ext)) {
          return;
        }
        
        fileList.push(filePath);
      } catch (err) {
        console.error(`Error accessing ${filePath}: ${err.message}`);
      }
    });
    
    return fileList;
  } catch (err) {
    console.error(`Error reading directory ${dir}: ${err.message}`);
    return fileList;
  }
}

// Main function
function main() {
  console.log(`${colors.cyan}=== Refactor Scanner: ${scope.toUpperCase()} Scope ===${colors.reset}\n`);
  
  try {
    // Get the project root directory
    const projectDir = process.cwd();
    
    console.log(`${colors.blue}Scanning directory:${colors.reset} ${projectDir}\n`);
    
    // Load ignored patterns
    const ignoredPatterns = loadIgnoredPatterns();
    console.log(`${colors.yellow}Ignored directories:${colors.reset} ${ignoredPatterns.ignoredDirs.join(', ')}`);
    console.log(`${colors.yellow}Ignored files:${colors.reset} ${ignoredPatterns.ignoredFiles.join(', ')}`);
    console.log(`${colors.yellow}Ignored extensions:${colors.reset} ${ignoredPatterns.ignoredExtensions.join(', ')}`);
    console.log(`${colors.yellow}Exempted patterns:${colors.reset} ${ignoredPatterns.exemptedPatterns.length} patterns\n`);
    
    // Get all files based on scope
    let targetDir = path.join(projectDir, 'src');
    if (scope === 'components') {
      targetDir = path.join(projectDir, 'src', 'components');
    }
    
    console.log(`${colors.blue}Target directory:${colors.reset} ${targetDir}\n`);
    
    // Check if directory exists
    if (!fs.existsSync(targetDir)) {
      console.error(`${colors.red}Error:${colors.reset} Target directory ${targetDir} does not exist`);
      process.exit(1);
    }
    
    // Get all files
    const files = getAllFiles(targetDir, [], ignoredPatterns);
    
    console.log(`${colors.green}Found ${files.length} files to analyze${colors.reset}\n`);
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(projectDir, 'scripts', 'refactor');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write files to JSON file
    const outputFile = path.join(outputDir, 'scanner-result.json');
    fs.writeFileSync(outputFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      scope,
      files,
      exemptedPatterns: ignoredPatterns.exemptedPatterns
    }, null, 2));
    
    console.log(`${colors.green}Files to analyze saved to:${colors.reset} ${outputFile}`);
    
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run the script
main(); 