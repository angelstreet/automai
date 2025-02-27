#!/usr/bin/env node

/**
 * Refactor Reporter Script
 * 
 * This script generates reports based on the analysis results from refactor-analyzer.js.
 * 
 * Usage:
 *   node scripts/refactor/refactor-reporter.js [--input=<file>] [--format=<format>]
 * 
 * Input:
 *   --input=<file>   : JSON file with analysis results (default: scripts/refactor/analyzer-result.json)
 * 
 * Format:
 *   --format=md      : Generate markdown reports (default)
 *   --format=console : Only output to console
 *   --format=both    : Output to both console and markdown
 */

const fs = require('fs');
const path = require('path');

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
let inputFile = 'scripts/refactor/analyzer-result.json';
let format = 'md';

args.forEach(arg => {
  if (arg.startsWith('--input=')) {
    inputFile = arg.split('=')[1];
  } else if (arg.startsWith('--format=')) {
    format = arg.split('=')[1];
  }
});

// Validate input arguments
const validFormats = ['md', 'console', 'both'];
if (!validFormats.includes(format)) {
  console.log(`Warning: Invalid format '${format}'. Using default 'md'.`);
  format = 'md';
}

// Generate markdown reports
function generateMarkdownReports(results) {
  // Group by issue type
  const namingIssues = results.filter(r => r.issues.some(i => i.issue === 'naming'));
  const locationIssues = results.filter(r => r.issues.some(i => i.issue === 'location'));
  const sizeIssues = results.filter(r => r.issues.some(i => i.issue === 'size'));
  
  // Find files with multiple issues for cross-referencing
  const multiIssueFiles = results.filter(r => r.issues.length > 1);
  
  // Define output directory
  const outputDir = path.join(process.cwd(), 'scripts');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
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
    fs.writeFileSync(path.join(outputDir, 'refactor-result-multi-issues.md'), summaryContent);
    console.log(`- ${outputDir}/refactor-result-multi-issues.md`);
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

1. **Maximum Retries: 3**
   - Do not retry the same task more than 3 times
   - If you encounter persistent issues after 3 attempts, seek help
2. **Commit frequently** to avoid large, complex changes
3. **Run tests** after each significant change
`;
  
  renameMoveContent += refactoringStrategy;
  reviewContent += refactoringStrategy;
  breakdownContent += refactoringStrategy;
  
  // Write files
  fs.writeFileSync(path.join(outputDir, 'refactor-result-naming.md'), renameMoveContent);
  fs.writeFileSync(path.join(outputDir, 'refactor-result-location.md'), reviewContent);
  fs.writeFileSync(path.join(outputDir, 'refactor-result-size.md'), breakdownContent);
  
  console.log(`\n${colors.green}Markdown reports generated in ${outputDir}:${colors.reset}`);
  console.log(`- ${outputDir}/refactor-result-naming.md`);
  console.log(`- ${outputDir}/refactor-result-location.md`);
  console.log(`- ${outputDir}/refactor-result-size.md`);
}

// Print refactoring recommendations to console
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
  console.log(`1. Maximum Retries: 3`);
  console.log(`   - Do not retry the same task more than 3 times`);
  console.log(`   - If you encounter persistent issues after 3 attempts, seek help`);
  console.log(`2. Commit frequently to avoid large, complex changes`);
  console.log(`3. Run tests after each significant change`);
}

// Main function
function main() {
  console.log(`=== Refactor Reporter: ${format.toUpperCase()} Format ===\n`);
  
  try {
    // Check if input file exists
    if (!fs.existsSync(inputFile)) {
      console.error(`Error: Input file ${inputFile} does not exist`);
      console.log(`Run 'node scripts/refactor/refactor-analyzer.js' first to generate the analysis results.`);
      process.exit(1);
    }
    
    // Read input file
    const analysisData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    const { results } = analysisData;
    
    console.log(`Generating reports for ${results.length} files with issues...\n`);
    
    // Generate reports based on format
    if (format === 'md' || format === 'both') {
      generateMarkdownReports(results);
    }
    
    if (format === 'console' || format === 'both') {
      printRecommendations(results);
    }
    
    console.log(`\nReport generation complete.`);
    
  } catch (error) {
    console.error(`Error:`, error.message);
    process.exit(1);
  }
}

// Run the script
main(); 