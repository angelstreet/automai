#!/usr/bin/env node

/**
 * Refactor Analyzer Script
 * 
 * This script analyzes the codebase for refactoring needs:
 * 1. Naming convention issues
 * 2. Location/organization issues
 * 3. File size issues (> 300 lines)
 * 
 * Usage:
 *   node scripts/refactor-analyzer.js [--scope=<scope>] [--output=<format>]
 * 
 * Scopes:
 *   --scope=quick   : Only check naming and location issues (default)
 *   --scope=full    : Check everything including file size
 *   --scope=app     : Only check the app directory
 *   --scope=components : Only check the components directory
 * 
 * Output:
 *   --output=console : Only output to console (default)
 *   --output=md      : Generate markdown reports in addition to console output
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// Parse command line arguments
const args = process.argv.slice(2);
let scope = 'quick'; // Default scope
let outputFormat = 'console'; // Default output format

args.forEach(arg => {
  if (arg.startsWith('--scope=')) {
    scope = arg.split('=')[1];
  } else if (arg.startsWith('--output=')) {
    outputFormat = arg.split('=')[1];
  }
});

// Validate input arguments
const validScopes = ['quick', 'full', 'app', 'components'];
const validOutputs = ['console', 'md'];
if (!validScopes.includes(scope)) {
  console.log(`${colors.yellow}Warning: Invalid scope '${scope}'. Using default 'quick'.${colors.reset}`);
  scope = 'quick';
}
if (!validOutputs.includes(outputFormat)) {
  console.log(`${colors.yellow}Warning: Invalid output format '${outputFormat}'. Using default 'console'.${colors.reset}`);
  outputFormat = 'console';
}

// Configuration
const MAX_LINES = 300;
const MAX_RETRIES = 3; // Maximum number of retries for the same task
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

// Constants for naming and location patterns
const NAMING_PATTERNS = {
  component: /^[A-Z][a-zA-Z0-9]*\.tsx$/,
  hook: /^use[A-Z][a-zA-Z0-9]*\.(ts|tsx)$/,
  util: /^[a-z][a-zA-Z0-9]*\.ts$/,
  constant: /^[a-z][a-zA-Z0-9]*\.ts$/,
  type: /^[a-z][a-zA-Z0-9]*\.ts$/,
  shadcnComponent: /^[a-z][a-zA-Z0-9-]*\.(ts|tsx)$/,
};

const LOCATION_PATTERNS = {
  component: [
    /^src\/components\/common\//,
    /^src\/components\/[a-z]+\//,
    /^src\/app\/\[locale\]\/\[tenant\]\/[a-z]+\/_components\//,
    /^src\/app\/\[locale\]\/\[tenant\]\/[a-z]+\/components\//,
    /^src\/app\/\[locale\]\/components\//
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
    /^src\/app\/\[locale\]\/\[tenant\]\/[a-z]+\/utils\//
  ],
  constant: [
    /^src\/constants\//,
    /^src\/lib\/constants\//
  ],
  type: [
    /^src\/types\//,
    /^src\/lib\/types\//
  ]
};

// Breakdown suggestions based on file type
const BREAKDOWN_SUGGESTIONS = {
  component: "Create a directory with the component name, use index.tsx as the main component, and extract child components into the same directory. See 'Refactoring Guidelines: Components'.",
  page: "Create a _components directory for page-specific components, extract sections into separate components, and move data fetching to actions.ts or api.ts. See 'Refactoring Guidelines: Pages'.",
  util: "Group related functions by functionality into separate files and create an index.ts to re-export them. See 'Refactoring Guidelines: Utility Functions'.",
  hook: "Split by functionality into separate hooks following use[Feature][Action].ts pattern and organize internals (state, derived state, handlers, effects). See 'Refactoring Guidelines: Hooks'.",
  constant: "Group related constants in separate files by domain and use index.ts to re-export all constants. See 'Refactoring Guidelines: Constants'.",
  type: "Group related types in separate files by domain and use index.ts to re-export all types. See 'Refactoring Guidelines: Types'.",
  default: "Review the file's purpose and split based on logical concerns. See 'Refactoring Guidelines' for specific patterns."
};

// Get all files in the project
function getAllFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(filePath);
        
        // Skip ignored directories
        if (stat.isDirectory()) {
          // Check full path against ignored patterns
          if (IGNORED_DIRS.some(ignored => filePath.includes(`/${ignored}`))) {
            return;
          }
          getAllFiles(filePath, fileList);
          return;
        }
        
        // Skip ignored files and extensions
        const ext = path.extname(file);
        if (IGNORED_FILES.includes(file) || IGNORED_EXTENSIONS.includes(ext)) {
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

// Check if a file is exempted from the line limit
function isExempted(filePath) {
  return EXEMPTED_PATTERNS.some(pattern => pattern.test(filePath));
}

// Count lines in a file
function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.split('\n').length;
}

// Determine file type based on content and path
function determineFileType(filePath, content) {
  // Check if it's a Shadcn UI component
  if (filePath.startsWith('src/components/ui/') || filePath.includes('/components/ui/')) {
    return 'shadcnComponent';
  }
  
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName);
  
  // Check file extension first - if not tsx/jsx/ts, unlikely to be a React component
  if (!['.tsx', '.jsx', '.ts'].includes(ext)) {
    return 'other';
  }
  
  // Check if it's a component
  if (filePath.includes('/components/') || filePath.includes('/_components/')) {
    // More accurate check for React components
    if (content.includes('import React') || 
        content.includes('from "react"') || 
        content.includes("from 'react'") ||
        (content.includes('<') && content.includes('/>')) ||
        (content.includes('export') && 
         (content.includes('function') || content.includes('const') || content.includes('class')) && 
         content.includes('return') && 
         (content.includes('<') || content.includes('null')))) {
      return 'component';
    }
  }
  
  // Check if it's a hook
  if (fileName.startsWith('use') && 
      (content.includes('useState') || content.includes('useEffect') || 
       content.includes('useRef') || content.includes('useCallback'))) {
    return 'hook';
  }
  
  // Check if it's a utility
  if ((filePath.includes('/utils/') || filePath.includes('/lib/')) && 
      content.includes('export') && content.includes('function')) {
    return 'util';
  }
  
  // Check if it's a constants file
  if (filePath.includes('/constants/') || 
      (content.includes('export const') && 
       !content.includes('return') && !content.includes('function'))) {
    return 'constant';
  }
  
  // Check if it's a types file
  if (content.includes('interface ') || 
      content.includes('type ') || 
      content.includes('enum ') ||
      content.match(/export (type|interface|enum)/)) {
    return 'type';
  }
  
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
    }
    
    return { isValid: false, message, suggestion: `Rename to follow ${message}` };
  }
  
  return { isValid: true };
}

// Function to check if a file is a Shadcn UI component
function isShadcnUIComponent(filePath) {
  return filePath.startsWith('src/components/ui/');
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
      suggestion = 'Utils should be in src/utils/ or src/lib/utils/';
      break;
    case 'constant':
      suggestion = 'Constants should be in src/constants/ or src/lib/constants/';
      break;
    case 'type':
      suggestion = 'Types should be in src/types/ or src/lib/types/';
      break;
    default:
      suggestion = `${fileType} is in an incorrect location`;
  }

  return { valid: false, message: `${fileType} in incorrect location`, suggestion };
}

// Check file size
function checkFileSize(filePath, lineCount, content) {
  if (lineCount > MAX_LINES && !isExempted(filePath)) {
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
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lineCount = content.split('\n').length;
    const fileType = determineFileType(filePath, content);
    const issues = [];
    
    // Check naming convention
    const namingIssue = checkNamingConvention(path.basename(filePath), fileType);
    if (namingIssue.isValid === false) {
      issues.push({
        issue: 'naming',
        message: namingIssue.message,
        suggestion: namingIssue.suggestion
      });
    }
    
    // Check location convention
    const locationIssue = checkLocationConvention(filePath, fileType);
    if (locationIssue.valid === false) {
      issues.push({
        issue: 'location',
        message: locationIssue.message || 'Location issue',
        suggestion: locationIssue.suggestion || 'Move to correct location'
      });
    }
    
    // Check file size if scope is 'full'
    if (scope === 'full') {
      const sizeIssue = checkFileSize(filePath, lineCount, content);
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

// Generate markdown reports
function generateMarkdownReports(results) {
  // Group by issue type
  const namingIssues = results.filter(r => r.issues.some(i => i.issue === 'naming'));
  const locationIssues = results.filter(r => r.issues.some(i => i.issue === 'location'));
  const sizeIssues = results.filter(r => r.issues.some(i => i.issue === 'size'));
  
  // Find files with multiple issues for cross-referencing
  const multiIssueFiles = results.filter(r => r.issues.length > 1);
  
  // Generate rename-move-report.md
  let renameMoveContent = `# Files to Rename or Move\n\n`;
  renameMoveContent += `_Generated on ${new Date().toLocaleString()}_\n\n`;
  renameMoveContent += `## Naming Convention Issues (${namingIssues.length})\n\n`;
  
  if (namingIssues.length > 0) {
    namingIssues.forEach(result => {
      const issue = result.issues.find(i => i.issue === 'naming');
      renameMoveContent += `### ${result.filePath}\n`;
      renameMoveContent += `- **Issue**: ${issue.message}\n`;
      renameMoveContent += `- **Fix**: ${issue.suggestion}\n`;
      
      // Add cross-reference if the file has multiple issues
      if (result.issues.length > 1) {
        const otherIssues = result.issues.filter(i => i.issue !== 'naming').map(i => i.issue);
        renameMoveContent += `- **Note**: This file also has ${otherIssues.join(', ')} issues. Check other reports.\n`;
      }
      
      renameMoveContent += `\n`;
    });
  } else {
    renameMoveContent += `No naming convention issues found.\n\n`;
  }
  
  // Generate review-report.md
  let reviewContent = `# Files to Review\n\n`;
  reviewContent += `_Generated on ${new Date().toLocaleString()}_\n\n`;
  reviewContent += `## Location Convention Issues (${locationIssues.length})\n\n`;
  
  if (locationIssues.length > 0) {
    locationIssues.forEach(result => {
      const issue = result.issues.find(i => i.issue === 'location');
      reviewContent += `### ${result.filePath}\n`;
      reviewContent += `- **Issue**: ${issue.message}\n`;
      reviewContent += `- **Fix**: ${issue.suggestion}\n`;
      
      // Add cross-reference if the file has multiple issues
      if (result.issues.length > 1) {
        const otherIssues = result.issues.filter(i => i.issue !== 'location').map(i => i.issue);
        reviewContent += `- **Note**: This file also has ${otherIssues.join(', ')} issues. Check other reports.\n`;
      }
      
      reviewContent += `\n`;
    });
  } else {
    reviewContent += `No location convention issues found.\n\n`;
  }
  
  // Generate breakdown-report.md
  let breakdownContent = `# Files to Break Down\n\n`;
  breakdownContent += `_Generated on ${new Date().toLocaleString()}_\n\n`;
  breakdownContent += `## File Size Issues (${sizeIssues.length})\n\n`;
  
  if (sizeIssues.length > 0) {
    sizeIssues.forEach(result => {
      const issue = result.issues.find(i => i.issue === 'size');
      breakdownContent += `### ${result.filePath} (${result.lineCount} lines)\n`;
      breakdownContent += `- **Issue**: ${issue.message}\n`;
      breakdownContent += `- **Fix**: ${issue.suggestion}\n`;
      
      // Add cross-reference if the file has multiple issues
      if (result.issues.length > 1) {
        const otherIssues = result.issues.filter(i => i.issue !== 'size').map(i => i.issue);
        breakdownContent += `- **Note**: This file also has ${otherIssues.join(', ')} issues. Check other reports.\n`;
      }
      
      breakdownContent += `\n`;
    });
  } else {
    breakdownContent += `No file size issues found.\n\n`;
  }

  // If there are files with multiple issues, generate a summary
  if (multiIssueFiles.length > 0) {
    let summaryContent = `# Files with Multiple Issues\n\n`;
    summaryContent += `_Generated on ${new Date().toLocaleString()}_\n\n`;
    summaryContent += `## Files Requiring Multiple Fixes (${multiIssueFiles.length})\n\n`;
    
    multiIssueFiles.forEach(result => {
      summaryContent += `### ${result.filePath}\n`;
      summaryContent += `- **File Type**: ${result.fileType}\n`;
      summaryContent += `- **Line Count**: ${result.lineCount}\n`;
      summaryContent += `- **Issues Found**: ${result.issues.map(i => i.issue).join(', ')}\n\n`;
      
      result.issues.forEach(issue => {
        summaryContent += `#### ${issue.issue.charAt(0).toUpperCase() + issue.issue.slice(1)} Issue\n`;
        summaryContent += `- **Issue**: ${issue.message}\n`;
        summaryContent += `- **Fix**: ${issue.suggestion}\n\n`;
      });
      
      summaryContent += `\n`;
    });
    
    // Write the multi-issue summary
    fs.writeFileSync(path.join(outputDir, 'multi-issue-summary.md'), summaryContent);
    console.log(`- ${outputDir}/multi-issue-summary.md`);
  }
  
  // Add refactoring strategy to each report
  const refactoringStrategy = `
## Refactoring Strategy

1. **Quick Fixes (Naming & Location)**
   - Fix naming convention issues first
   - Then address location issues
   - Commit after each batch of similar changes

2. **Complex Refactoring (File Size)**
   - Tackle one file at a time
   - Follow the directory structure in component-organization-plan.md
   - Test thoroughly after each refactor
   - Commit after each file refactor

## General Rules

1. **Maximum Retries: ${MAX_RETRIES}**
   - Do not retry the same task more than ${MAX_RETRIES} times
   - If you encounter persistent issues after ${MAX_RETRIES} attempts, seek help
2. **Commit frequently** to avoid large, complex changes
3. **Run tests** after each significant change
`;
  
  renameMoveContent += refactoringStrategy;
  reviewContent += refactoringStrategy;
  breakdownContent += refactoringStrategy;
  
  // Write files
  const outputDir = 'scripts';
  fs.writeFileSync(path.join(outputDir, 'rename-move-report.md'), renameMoveContent);
  fs.writeFileSync(path.join(outputDir, 'review-report.md'), reviewContent);
  fs.writeFileSync(path.join(outputDir, 'breakdown-report.md'), breakdownContent);
  
  console.log(`\n${colors.green}Markdown reports generated in ${outputDir}:${colors.reset}`);
  console.log(`- ${outputDir}/rename-move-report.md`);
  console.log(`- ${outputDir}/review-report.md`);
  console.log(`- ${outputDir}/breakdown-report.md`);
}

// Print refactoring recommendations
function printRecommendations(results) {
  console.log(`\n${colors.cyan}=== Refactoring Recommendations ===${colors.reset}\n`);
  
  // Group by issue type
  const namingIssues = results.filter(r => r.issues.some(i => i.issue === 'naming'));
  const locationIssues = results.filter(r => r.issues.some(i => i.issue === 'location'));
  const sizeIssues = results.filter(r => r.issues.some(i => i.issue === 'size'));
  
  // Find files with multiple issues
  const multiIssueFiles = results.filter(r => r.issues.length > 1);
  
  // Print naming issues
  if (namingIssues.length > 0) {
    console.log(`${colors.yellow}Naming Convention Issues (${namingIssues.length})${colors.reset}`);
    namingIssues.forEach(result => {
      const issue = result.issues.find(i => i.issue === 'naming');
      console.log(`  ${colors.red}${result.filePath}${colors.reset}`);
      console.log(`    ${colors.yellow}Issue:${colors.reset} ${issue.message}`);
      console.log(`    ${colors.green}Fix:${colors.reset} ${issue.suggestion}`);
      
      // Add cross-reference if the file has multiple issues
      if (result.issues.length > 1) {
        const otherIssues = result.issues.filter(i => i.issue !== 'naming').map(i => i.issue);
        console.log(`    ${colors.magenta}Note:${colors.reset} This file also has ${otherIssues.join(', ')} issues`);
      }
      
      console.log('');
    });
  }
  
  // Print location issues
  if (locationIssues.length > 0) {
    console.log(`${colors.yellow}Location Convention Issues (${locationIssues.length})${colors.reset}`);
    locationIssues.forEach(result => {
      const issue = result.issues.find(i => i.issue === 'location');
      console.log(`  ${colors.red}${result.filePath}${colors.reset}`);
      console.log(`    ${colors.yellow}Issue:${colors.reset} ${issue.message}`);
      console.log(`    ${colors.green}Fix:${colors.reset} ${issue.suggestion}`);
      console.log('');
    });
  }
  
  // Print size issues
  if (sizeIssues.length > 0) {
    console.log(`${colors.yellow}File Size Issues (${sizeIssues.length})${colors.reset}`);
    sizeIssues.forEach(result => {
      const issue = result.issues.find(i => i.issue === 'size');
      console.log(`  ${colors.red}${result.filePath}${colors.reset} (${result.lineCount} lines)`);
      console.log(`    ${colors.yellow}Issue:${colors.reset} ${issue.message}`);
      console.log(`    ${colors.green}Fix:${colors.reset} ${issue.suggestion}`);
      console.log('');
    });
  }
  
  // Print multi-issue file summary
  if (multiIssueFiles.length > 0) {
    console.log(`\n${colors.magenta}Files with Multiple Issues (${multiIssueFiles.length})${colors.reset}`);
    multiIssueFiles.forEach(result => {
      console.log(`  ${colors.red}${result.filePath}${colors.reset}`);
      console.log(`    ${colors.yellow}Issues:${colors.reset} ${result.issues.map(i => i.issue).join(', ')}`);
      console.log('');
    });
  }
  
  // Print summary
  console.log(`\n${colors.cyan}=== Summary ===${colors.reset}`);
  console.log(`Total files analyzed: ${results.length}`);
  console.log(`Naming issues: ${namingIssues.length}`);
  console.log(`Location issues: ${locationIssues.length}`);
  console.log(`Size issues: ${sizeIssues.length}`);
  console.log(`Files with multiple issues: ${multiIssueFiles.length}`);
  
  // Print refactoring strategy
  console.log(`\n${colors.cyan}=== Refactoring Strategy ===${colors.reset}`);
  console.log(`1. Quick Fixes (Naming & Location)`);
  console.log(`   - Fix naming convention issues first`);
  console.log(`   - Then address location issues`);
  console.log(`   - Commit after each batch of similar changes`);
  
  console.log(`\n2. Complex Refactoring (File Size)`);
  console.log(`   - Tackle one file at a time`);
  console.log(`   - Follow the directory structure in component-organization-plan.md`);
  console.log(`   - Test thoroughly after each refactor`);
  console.log(`   - Commit after each file refactor`);
  
  console.log(`\n${colors.cyan}=== General Rules ===${colors.reset}`);
  console.log(`1. Maximum Retries: ${MAX_RETRIES}`);
  console.log(`   - Do not retry the same task more than ${MAX_RETRIES} times`);
  console.log(`   - If you encounter persistent issues after ${MAX_RETRIES} attempts, seek help`);
  console.log(`2. Commit frequently to avoid large, complex changes`);
  console.log(`3. Run tests after each significant change`);
  
  // Generate markdown reports if requested
  if (outputFormat === 'md') {
    generateMarkdownReports(results);
  }
}

// Main function
function main() {
  console.log(`${colors.cyan}=== Refactor Analyzer: ${scope.toUpperCase()} Mode ===${colors.reset}\n`);
  
  try {
    // Get the project root directory
    const rootDir = execSync('git rev-parse --show-toplevel').toString().trim();
    
    // If not in a git repository, use the current directory
    const projectDir = rootDir || process.cwd();
    
    console.log(`${colors.blue}Scanning directory:${colors.reset} ${projectDir}\n`);
    
    // Get all files based on scope
    let targetDir = projectDir;
    if (scope === 'app') {
      targetDir = path.join(projectDir, 'src', 'app');
    } else if (scope === 'components') {
      targetDir = path.join(projectDir, 'src', 'components');
    } else {
      targetDir = path.join(projectDir, 'src');
    }
    
    console.log(`${colors.blue}Target directory:${colors.reset} ${targetDir}\n`);
    
    // Check if directory exists
    if (!fs.existsSync(targetDir)) {
      console.error(`${colors.red}Error:${colors.reset} Target directory ${targetDir} does not exist`);
      process.exit(1);
    }
    
    // Get all files
    const files = getAllFiles(targetDir);
    
    // Analyze each file
    const results = [];
    files.forEach(file => {
      const result = analyzeFile(file);
      if (result.issues.length > 0) {
        results.push(result);
      }
    });
    
    // Print recommendations
    printRecommendations(results);
    
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run the script
main(); 