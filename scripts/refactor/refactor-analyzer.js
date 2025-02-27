#!/usr/bin/env node

/**
 * Refactor Analyzer Script
 * 
 * This script analyzes files for refactoring needs:
 * 1. Naming convention issues
 * 2. Location/organization issues
 * 3. File size issues (> 300 lines)
 * 
 * Usage:
 *   node scripts/refactor/refactor-analyzer.js [--input=<file>] [--check=<checks>]
 * 
 * Input:
 *   --input=<file>   : JSON file with files to analyze (default: scripts/refactor/scanner-result.json)
 * 
 * Checks:
 *   --check=all      : Check naming, location, and size issues (default)
 *   --check=naming   : Only check naming issues
 *   --check=location : Only check location issues
 *   --check=size     : Only check size issues
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let inputFile = 'scripts/refactor/scanner-result.json';
let checks = 'all';

args.forEach(arg => {
  if (arg.startsWith('--input=')) {
    inputFile = arg.split('=')[1];
  } else if (arg.startsWith('--check=')) {
    checks = arg.split('=')[1];
  }
});

// Validate input arguments
const validChecks = ['all', 'naming', 'location', 'size'];
if (!validChecks.includes(checks)) {
  console.log(`Warning: Invalid check '${checks}'. Using default 'all'.`);
  checks = 'all';
}

// Configuration
const MAX_LINES = 300;

// Constants for naming and location patterns
const NAMING_PATTERNS = {
  component: /^[A-Z][a-zA-Z0-9]*\.tsx$/,
  hook: /^use[A-Z][a-zA-Z0-9]*\.(ts|tsx)$/,
  util: /^[a-z][a-zA-Z0-9]*\.ts$/,
  constant: /^[a-z][a-zA-Z0-9]*\.ts$/,
  type: /^[a-z][a-zA-Z0-9]*\.ts$/,
  shadcnComponent: /^[a-z][a-zA-Z0-9-]*\.(ts|tsx)$/,
  page: /^page\.(ts|tsx)$/,
  dynamicRoute: /^\[([a-z0-9]+-)*[a-z0-9]+\]\.(ts|tsx)$/,
  pageFolder: /^([a-z0-9]+-)*[a-z0-9]+$/,
};

const LOCATION_PATTERNS = {
  component: [
    /^src\/components\/common\//,
    /^src\/components\/[a-z]+\//,
    /^src\/components\//,
    /^src\/app\/\[locale\]\/\[tenant\]\/[a-z]+\/_components\//,
    /^src\/app\/\[locale\]\/\[tenant\]\/[a-z]+\/components\//,
    /^src\/app\/\[locale\]\/components\//,
    /^src\/components\/layout\//,
    /^src\/components\/ui\//,
    /^src\/components\/sidebar\//,
    /^src\/components\/hosts\//,
    /^src\/components\/usecases\//,
    /^src\/components\/profile\//,
    /^src\/components\/settings\//,
    /^src\/components\/dashboard\//,
    /^src\/components\/icons\//
  ],
  shadcnComponent: [
    /^src\/components\/ui\//
  ],
  hook: [
    /^src\/hooks\//,
    /^src\/lib\/hooks\//,
    /^src\/app\/\[locale\]\/\[tenant\]\/[a-z]+\/hooks\//
  ],
  util: [
    /^src\/utils\//,
    /^src\/lib\/utils\//,
    /^src\/lib\//,
    /^src\/app\/\[locale\]\/\[tenant\]\/[a-z]+\/utils\//,
    /^src\/lib\/services\//,
    /^src\/lib\/contexts\//
  ],
  constant: [
    /^src\/constants\//,
    /^src\/lib\/constants\//,
    /^src\/config\//
  ],
  type: [
    /^src\/types\//,
    /^src\/lib\/types\//,
    /^src\/interfaces\//,
    /^src\/context\//
  ],
  page: [
    /^src\/pages\/.*\.(ts|tsx)$/,
    /^src\/app\/\[locale\]\/page\.(ts|tsx)$/,
    /^src\/app\/\[locale\]\/\[tenant\]\/page\.(ts|tsx)$/,
    /^src\/app\/\[locale\]\/\[tenant\]\/[a-z-]+\/page\.(ts|tsx)$/,
    /^src\/app\/\[locale\]\/\[tenant\]\/[a-z-]+\/[a-z-]+\/page\.(ts|tsx)$/,
    /^src\/app\/.*\/page\.(ts|tsx)$/
  ],
  dynamicRoute: [
    /^src\/pages\/\[([a-z0-9]+-)*[a-z0-9]+\]\//,
    /^src\/app\/\[locale\]\/\[([a-z0-9]+-)*[a-z0-9]+\]\//,
    /^src\/app\/\[locale\]\/\[tenant\]\/\[([a-z0-9]+-)*[a-z0-9]+\]\//,
    /^src\/app\/\[locale\]\/\[tenant\]\/[a-z-]+\/\[([a-z0-9]+-)*[a-z0-9]+\]\//,
    /^src\/app\/.*\/\[([a-z0-9]+-)*[a-z0-9]+\]\//
  ],
  api: [
    /^src\/app\/api\//,
    /^src\/server\/api\//
  ],
  server: [
    /^src\/server\//
  ]
};

// Breakdown suggestions based on file type
const BREAKDOWN_SUGGESTIONS = {
  component: "Create a directory with the component name, use index.tsx as the main component, and extract child components into the same directory. See 'Refactoring Guidelines: Components'.",
  page: "Create a _components directory for page-specific components, extract sections into separate components, and move data fetching to actions.ts or api.ts. See 'Refactoring Guidelines: Pages'.",
  dynamicRoute: "Create a _components directory for route-specific components, extract sections into separate components, and move data fetching to actions.ts or api.ts. See 'Refactoring Guidelines: Pages'.",
  util: "Group related functions by functionality into separate files and create an index.ts to re-export them. See 'Refactoring Guidelines: Utility Functions'.",
  hook: "Split by functionality into separate hooks following use[Feature][Action].ts pattern and organize internals (state, derived state, handlers, effects). See 'Refactoring Guidelines: Hooks'.",
  constant: "Group related constants in separate files by domain and use index.ts to re-export all constants. See 'Refactoring Guidelines: Constants'.",
  type: "Group related types in separate files by domain and use index.ts to re-export all types. See 'Refactoring Guidelines: Types'.",
  default: "Review the file's purpose and split based on logical concerns. See 'Refactoring Guidelines' for specific patterns."
};

// Check if a file is exempted from the line limit
function isExempted(filePath, exemptedPatterns) {
  return exemptedPatterns.some(pattern => {
    // Convert string representation back to RegExp
    if (typeof pattern === 'string') {
      const match = pattern.match(/^\/(.*)\/([gimuy]*)$/);
      if (match) {
        return new RegExp(match[1], match[2]).test(filePath);
      }
      return false;
    }
    return pattern.test(filePath);
  });
}

// Count lines in a file
function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error.message}`);
    return 0;
  }
}

// Helper functions for file type detection
function isShadcnComponent(filePath) {
  return filePath.startsWith('src/components/ui/') || filePath.includes('/components/ui/');
}

function isApiRoute(filePath, fileName) {
  return filePath.includes('/api/') && (fileName === 'route.ts' || fileName === 'route.tsx');
}

function isServerFile(filePath) {
  return filePath.startsWith('src/server/');
}

function isPageFile(fileName) {
  return fileName === 'page.tsx' || fileName === 'page.ts';
}

function isLayoutFile(fileName) {
  return fileName === 'layout.tsx' || fileName === 'layout.ts';
}

function isDynamicRoute(fileName) {
  return fileName.startsWith('[') && fileName.includes(']');
}

function isReactComponent(filePath, content) {
  if (filePath.includes('/components/') || filePath.includes('/_components/')) {
    return content.includes('import React') || 
           content.includes('from "react"') || 
           content.includes("from 'react'") ||
           (content.includes('<') && content.includes('/>')) ||
           (content.includes('export') && 
            (content.includes('function') || content.includes('const') || content.includes('class')) && 
            content.includes('return') && 
            (content.includes('<') || content.includes('null')));
  }
  return false;
}

function isHook(fileName, filePath, content) {
  return (fileName.startsWith('use') || filePath.includes('/hooks/')) && 
         (content.includes('useState') || content.includes('useEffect') || 
          content.includes('useRef') || content.includes('useCallback'));
}

function isContextFile(filePath, fileName) {
  return filePath.includes('/context/') || filePath.includes('/contexts/') || 
         fileName.toLowerCase().includes('context') || fileName.toLowerCase().includes('provider');
}

function isUtilityFile(filePath, content) {
  return (filePath.includes('/utils/') || filePath.includes('/lib/')) && 
         content.includes('export') && content.includes('function');
}

function isConstantsFile(filePath, content) {
  return filePath.includes('/constants/') || filePath.includes('/config/') || 
         (content.includes('export const') && 
          !content.includes('return') && !content.includes('function'));
}

function isTypesFile(filePath, content) {
  return filePath.includes('/types/') || filePath.includes('/interfaces/') ||
         content.includes('interface ') || 
         content.includes('type ') || 
         content.includes('enum ') ||
         content.match(/export (type|interface|enum)/);
}

// Determine file type based on content and path
function determineFileType(filePath, content) {
  // Check for special file types first
  if (isShadcnComponent(filePath)) {
    return 'shadcnComponent';
  }
  
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName);
  
  // Check file extension first - if not tsx/jsx/ts, unlikely to be a React component
  if (!['.tsx', '.jsx', '.ts'].includes(ext)) {
    return 'other';
  }
  
  // Check for specific file types
  if (isApiRoute(filePath, fileName)) return 'api';
  if (isServerFile(filePath)) return 'server';
  if (isPageFile(fileName)) return 'page';
  if (isLayoutFile(fileName)) return 'layout';
  if (isDynamicRoute(fileName)) return 'dynamicRoute';
  if (isReactComponent(filePath, content)) return 'component';
  if (isHook(fileName, filePath, content)) return 'hook';
  if (isContextFile(filePath, fileName)) return 'type';
  if (isUtilityFile(filePath, content)) return 'util';
  if (isConstantsFile(filePath, content)) return 'constant';
  if (isTypesFile(filePath, content)) return 'type';
  
  // Default to the directory name
  const dirName = path.basename(path.dirname(filePath));
  return dirName;
}

// Function to check if a file follows naming conventions
function checkNamingConvention(fileName, fileType) {
  const pattern = NAMING_PATTERNS[fileType];
  
  if (pattern && !pattern.test(fileName)) {
    let message;
    if (fileType === 'component') {
      message = 'Component files should use PascalCase.tsx';
    } else if (fileType === 'hook') {
      message = 'Hook files should use camelCase and start with "use"';
    } else if (fileType === 'util') {
      message = 'Utility files should use camelCase.ts';
    } else if (fileType === 'constant') {
      message = 'Constants files should use camelCase.ts';
    } else if (fileType === 'type') {
      message = 'Type files should use camelCase.ts';
    } else if (fileType === 'page') {
      message = 'Page files should be named page.tsx';
    } else if (fileType === 'dynamicRoute') {
      message = 'Dynamic route files should use kebab-case in square brackets, e.g., [post-id].tsx';
    } else if (fileType === 'pageFolder') {
      message = 'Page folders should use kebab-case';
    }
    
    return { isValid: false, message, suggestion: `Rename to follow ${message}` };
  }
  
  return { isValid: true };
}

// Function to check if a file follows location conventions
function checkLocationConvention(filePath, fileType) {
  // If no file type could be determined, we can't check location
  if (!fileType) {
    return { valid: false, message: 'Unknown file type', suggestion: null };
  }

  // Special case for Shadcn UI components
  if (fileType === 'shadcnComponent') {
    return { valid: true, message: 'Shadcn UI component in correct location', suggestion: null };
  }

  // Get the patterns for this file type
  const patterns = LOCATION_PATTERNS[fileType];
  if (!patterns) {
    return { valid: false, message: `No location patterns defined for ${fileType}`, suggestion: null };
  }

  // Check if the file path matches any of the patterns
  const isValid = patterns.some(pattern => pattern.test(filePath));

  if (isValid) {
    return { valid: true, message: `${fileType} in correct location`, suggestion: null };
  }

  // Generate suggestion based on file type
  let suggestion;
  switch (fileType) {
    case 'component':
      suggestion = 'Component should be in src/components/common/, src/components/[feature]/, or src/app/[locale]/[tenant]/[feature]/_components/';
      break;
    case 'shadcnComponent':
      suggestion = 'Shadcn UI component should be in src/components/ui/';
      break;
    case 'hook':
      suggestion = 'Hooks should be in src/hooks/ or src/lib/hooks/';
      break;
    case 'util':
      suggestion = 'Utilities should be in src/utils/ or src/lib/utils/';
      break;
    case 'constant':
      suggestion = 'Constants should be in src/constants/ or src/lib/constants/';
      break;
    case 'type':
      suggestion = 'Types should be in src/types/ or src/lib/types/';
      break;
    case 'page':
      suggestion = 'Page files should be in src/app/[locale]/ or src/app/[locale]/[tenant]/ directories following Next.js App Router conventions';
      break;
    case 'dynamicRoute':
      suggestion = 'Dynamic route files should be in src/app/[locale]/ or src/app/[locale]/[tenant]/ directories with kebab-case names in square brackets';
      break;
    default:
      suggestion = `Unknown file type: ${fileType}`;
  }

  return { valid: false, message: `${fileType} in incorrect location`, suggestion };
}

// Check file size
function checkFileSize(filePath, lineCount, content, exemptedPatterns) {
  if (lineCount > MAX_LINES && !isExempted(filePath, exemptedPatterns)) {
    const fileType = determineFileType(filePath, content);
    const suggestion = BREAKDOWN_SUGGESTIONS[fileType] || BREAKDOWN_SUGGESTIONS.default;
    
    return {
      issue: 'size',
      message: `File exceeds ${MAX_LINES} lines (${lineCount} lines)`,
      suggestion: suggestion
    };
  }
  
  return null;
}

// Analyze a file for refactoring needs
function analyzeFile(filePath, exemptedPatterns) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lineCount = content.split('\n').length;
    const fileType = determineFileType(filePath, content);
    const issues = [];
    
    // Check naming convention if requested
    if (checks === 'all' || checks === 'naming') {
      const namingIssue = checkNamingConvention(path.basename(filePath), fileType);
      if (namingIssue.isValid === false) {
        issues.push({
          issue: 'naming',
          message: namingIssue.message,
          suggestion: namingIssue.suggestion
        });
      }
    }
    
    // Check location convention if requested
    if (checks === 'all' || checks === 'location') {
      const locationIssue = checkLocationConvention(filePath, fileType);
      if (locationIssue.valid === false) {
        issues.push({
          issue: 'location',
          message: locationIssue.message || 'Location issue',
          suggestion: locationIssue.suggestion || 'Move to correct location'
        });
      }
    }
    
    // Check file size if requested
    if (checks === 'all' || checks === 'size') {
      const sizeIssue = checkFileSize(filePath, lineCount, content, exemptedPatterns);
      if (sizeIssue) {
        issues.push(sizeIssue);
      }
    }
    
    return {
      filePath,
      fileType,
      lineCount,
      issues
    };
  } catch (error) {
    console.error(`Error analyzing file ${filePath}: ${error.message}`);
    return {
      filePath,
      fileType: 'unknown',
      lineCount: 0,
      issues: []
    };
  }
}

// Main function
function main() {
  console.log(`=== Refactor Analyzer: ${checks.toUpperCase()} Checks ===\n`);
  
  try {
    // Check if input file exists
    if (!fs.existsSync(inputFile)) {
      console.error(`Error: Input file ${inputFile} does not exist`);
      console.log(`Run 'node scripts/refactor/refactor-scanner.js' first to generate the input file.`);
      process.exit(1);
    }
    
    // Read input file
    const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    const { files, exemptedPatterns } = inputData;
    
    console.log(`Analyzing ${files.length} files...\n`);
    
    // Convert string patterns back to RegExp
    const exemptedPatternsRegExp = exemptedPatterns.map(pattern => {
      const match = pattern.match(/^\/(.*)\/([gimuy]*)$/);
      if (match) {
        return new RegExp(match[1], match[2]);
      }
      return pattern;
    });
    
    // Analyze each file
    const results = [];
    files.forEach(file => {
      const result = analyzeFile(file, exemptedPatternsRegExp);
      if (result.issues.length > 0) {
        results.push(result);
      }
    });
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'scripts', 'refactor');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write results to JSON file
    const outputFile = path.join(outputDir, 'analyzer-result.json');
    fs.writeFileSync(outputFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      checks,
      results
    }, null, 2));
    
    console.log(`Analysis complete. Found ${results.length} files with issues.`);
    console.log(`Results saved to: ${outputFile}`);
    
  } catch (error) {
    console.error(`Error:`, error.message);
    process.exit(1);
  }
}

// Run the script
main(); 