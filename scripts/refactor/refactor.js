#!/usr/bin/env node

/**
 * Refactor Script
 * 
 * This script runs all three refactoring scripts in sequence:
 * 1. refactor-scanner.js - Scans the codebase and identifies files to analyze
 * 2. refactor-analyzer.js - Analyzes files for naming, location, and size issues
 * 3. refactor-reporter.js - Generates reports based on analysis results
 * 
 * Usage:
 *   node scripts/refactor/refactor.js [--scope=<scope>] [--check=<checks>] [--format=<format>]
 * 
 * Scope:
 *   --scope=all        : Scan all files in the src directory (default)
 *   --scope=app        : Only scan the app directory
 *   --scope=components : Only scan the components directory
 * 
 * Checks:
 *   --check=all        : Check naming, location, and size issues (default)
 *   --check=naming     : Only check naming issues
 *   --check=location   : Only check location issues
 *   --check=size       : Only check size issues
 * 
 * Format:
 *   --format=md        : Generate markdown reports (default)
 *   --format=console   : Only output to console
 *   --format=both      : Output to both console and markdown
 */

const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
let scope = 'all';
let check = 'all';
let format = 'md';

args.forEach(arg => {
  if (arg.startsWith('--scope=')) {
    scope = arg.split('=')[1];
  } else if (arg.startsWith('--check=')) {
    check = arg.split('=')[1];
  } else if (arg.startsWith('--format=')) {
    format = arg.split('=')[1];
  }
});

// Validate input arguments
const validScopes = ['all', 'app', 'components'];
const validChecks = ['all', 'naming', 'location', 'size'];
const validFormats = ['md', 'console', 'both'];

if (!validScopes.includes(scope)) {
  console.log(`Warning: Invalid scope '${scope}'. Using default 'all'.`);
  scope = 'all';
}

if (!validChecks.includes(check)) {
  console.log(`Warning: Invalid check '${check}'. Using default 'all'.`);
  check = 'all';
}

if (!validFormats.includes(format)) {
  console.log(`Warning: Invalid format '${format}'. Using default 'md'.`);
  format = 'md';
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

// Main function
function main() {
  console.log(`${colors.cyan}=== Refactor Process Started ===${colors.reset}\n`);
  
  try {
    // Step 1: Run refactor-scanner.js
    console.log(`${colors.blue}Step 1: Scanning codebase (scope: ${scope})...${colors.reset}`);
    execSync(`node scripts/refactor/refactor-scanner.js --scope=${scope}`, { stdio: 'inherit' });
    
    // Step 2: Run refactor-analyzer.js
    console.log(`\n${colors.blue}Step 2: Analyzing files (check: ${check})...${colors.reset}`);
    execSync(`node scripts/refactor/refactor-analyzer.js --check=${check}`, { stdio: 'inherit' });
    
    // Step 3: Run refactor-reporter.js
    console.log(`\n${colors.blue}Step 3: Generating reports (format: ${format})...${colors.reset}`);
    execSync(`node scripts/refactor/refactor-reporter.js --format=${format}`, { stdio: 'inherit' });
    
    console.log(`\n${colors.green}=== Refactor Process Completed ===${colors.reset}`);
    console.log(`\nReports are available in the scripts directory.`);
    
  } catch (error) {
    console.error(`\n${colors.red}Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run the script
main(); 