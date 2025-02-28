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
  white: '\x1b[37m',
};

// Parse command line arguments
const args = process.argv.slice(2);
let inputFile = 'scripts/refactor/analyzer-result.json';
let format = 'md';

args.forEach((arg) => {
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
  const namingIssues = results.filter((r) => r.issues.some((i) => i.issue === 'naming'));
  const locationIssues = results.filter((r) => r.issues.some((i) => i.issue === 'location'));
  const sizeIssues = results.filter((r) => r.issues.some((i) => i.issue === 'size'));

  // Find files with multiple issues for cross-referencing
  const multiIssueFiles = results.filter((r) => r.issues.length > 1);

  // Define output directory
  const outputDir = path.join(process.cwd(), 'scripts', 'refactor');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate combined naming-location report
  let namingLocationContent = `# Files to Rename or Move\n\n`;
  namingLocationContent += `_Generated on ${new Date().toLocaleString()}_\n\n`;

  // Naming issues section
  if (namingIssues.length > 0) {
    namingLocationContent += `## Naming Convention Issues (${namingIssues.length})\n\n`;
    namingLocationContent += `| File | Suggested Name |\n`;
    namingLocationContent += `| ---- | -------------- |\n`;

    namingIssues.forEach((result) => {
      const issue = result.issues.find((i) => i.issue === 'naming');
      const fileName = path.basename(result.filePath);
      const fileDir = path.dirname(result.filePath);

      // Generate specific suggested name based on the current name
      let suggestedName = fileName;

      if (fileName.includes('-') && issue.suggestion.includes('PascalCase')) {
        // Convert kebab-case to PascalCase
        suggestedName = fileName
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join('');

        // Handle file extension
        if (suggestedName.includes('.')) {
          const parts = suggestedName.split('.');
          const extension = parts.pop();
          suggestedName = parts.join('.') + '.' + extension;
        }
      } else if (issue.suggestion.includes('camelCase')) {
        // Convert to camelCase
        const parts = fileName.split('.');
        const extension = parts.pop();
        const baseName = parts.join('.');

        // Convert kebab-case or snake_case to camelCase
        const camelCaseName = baseName.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());
        suggestedName = camelCaseName + '.' + extension;
      } else if (
        fileName === 'index.tsx' ||
        fileName === 'context.tsx' ||
        fileName === 'types.ts' ||
        fileName === 'utils.ts'
      ) {
        // Special case for index files in component directories
        const dirName = path.basename(path.dirname(result.filePath));
        if (dirName && dirName.charAt(0) === dirName.charAt(0).toUpperCase()) {
          // If parent directory is already PascalCase, use it as prefix
          suggestedName = dirName + fileName.charAt(0).toUpperCase() + fileName.slice(1);
        } else if (dirName) {
          // Convert directory name to PascalCase and use as prefix
          const pascalDirName = dirName
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');
          suggestedName = pascalDirName + fileName.charAt(0).toUpperCase() + fileName.slice(1);
        }
      }

      namingLocationContent += `| ${result.filePath} | ${suggestedName} |\n`;
    });

    namingLocationContent += `\n`;
  } else {
    namingLocationContent += `## Naming Convention Issues (0)\n\nNo naming convention issues found.\n\n`;
  }

  // Location issues section
  if (locationIssues.length > 0) {
    namingLocationContent += `## Location Convention Issues (${locationIssues.length})\n\n`;
    namingLocationContent += `| File | Suggested Location |\n`;
    namingLocationContent += `| ---- | ------------------ |\n`;

    locationIssues.forEach((result) => {
      const issue = result.issues.find((i) => i.issue === 'location');

      // Extract suggested location from the message
      let suggestedLocation = issue.suggestion;

      namingLocationContent += `| ${result.filePath} | ${suggestedLocation} |\n`;
    });

    namingLocationContent += `\n`;
  } else {
    namingLocationContent += `## Location Convention Issues (0)\n\nNo location convention issues found.\n\n`;
  }

  // Generate breakdown-report.md for size issues
  let breakdownContent = `# Files to Break Down\n\n`;
  breakdownContent += `_Generated on ${new Date().toLocaleString()}_\n\n`;
  breakdownContent += `## File Size Issues (${sizeIssues.length})\n\n`;

  if (sizeIssues.length > 0) {
    breakdownContent += `| File | Lines |\n`;
    breakdownContent += `| ---- | ----- |\n`;

    sizeIssues.forEach((result) => {
      breakdownContent += `| ${result.filePath} | ${result.lineCount} |\n`;
    });

    breakdownContent += `\n`;
  } else {
    breakdownContent += `No file size issues found.\n\n`;
  }

  // If there are files with multiple issues, generate a summary
  if (multiIssueFiles.length > 0) {
    let summaryContent = `# Files with Multiple Issues\n\n`;
    summaryContent += `_Generated on ${new Date().toLocaleString()}_\n\n`;
    summaryContent += `## Files Requiring Multiple Fixes (${multiIssueFiles.length})\n\n`;

    summaryContent += `| File | Type | Lines | Issues |\n`;
    summaryContent += `| ---- | ---- | ----- | ------ |\n`;

    multiIssueFiles.forEach((result) => {
      summaryContent += `| ${result.filePath} | ${result.fileType} | ${result.lineCount} | ${result.issues.map((i) => i.issue).join(', ')} |\n`;
    });

    summaryContent += `\n`;

    // Write the multi-issue summary
    fs.writeFileSync(path.join(outputDir, 'refactor-result-multi-issues.md'), summaryContent);
    console.log(`- ${outputDir}/refactor-result-multi-issues.md`);
  }

  // Add refactoring strategy to each report
  const namingLocationStrategy = `
## Refactoring Strategy

1. **Quick Fixes (Naming & Location)**
   - Fix naming convention issues first
     - Components: PascalCase.tsx
     - Hooks: useFeature.ts
     - Utilities: camelCase.ts
     - Pages: page.tsx in kebab-case folders
     - Dynamic routes: [kebab-case].tsx
   - Then address location issues
   - Commit after each batch of similar changes

## General Rules

1. **Maximum Retries: 3**
   - Do not retry the same task more than 3 times
   - If you encounter persistent issues after 3 attempts, seek help
2. **Commit frequently** to avoid large, complex changes
3. **Run tests** after each significant change
`;

  const sizeStrategy = `
## Refactoring Strategy

1. **Complex Refactoring (File Size)**
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

  namingLocationContent += namingLocationStrategy;
  breakdownContent += sizeStrategy;

  // Write files
  fs.writeFileSync(
    path.join(outputDir, 'refactor-result-naming-location.md'),
    namingLocationContent,
  );
  fs.writeFileSync(path.join(outputDir, 'refactor-result-size.md'), breakdownContent);

  // Generate summary report
  generateSummaryReport(namingIssues, locationIssues, sizeIssues, multiIssueFiles, outputDir);

  console.log(`\n${colors.green}Markdown reports generated in ${outputDir}:${colors.reset}`);
  console.log(`- ${outputDir}/refactor-result-naming-location.md`);
  console.log(`- ${outputDir}/refactor-result-size.md`);
  console.log(`- ${path.join(process.cwd(), 'scripts')}/refactor-report.md`);
  if (multiIssueFiles.length > 0) {
    console.log(`- ${outputDir}/refactor-result-multi-issues.md`);
  }
}

// Print refactoring recommendations to console
function printRecommendations(results) {
  console.log(`\n${colors.cyan}=== Refactoring Recommendations ===${colors.reset}\n`);

  // Group by issue type
  const namingIssues = results.filter((r) => r.issues.some((i) => i.issue === 'naming'));
  const locationIssues = results.filter((r) => r.issues.some((i) => i.issue === 'location'));
  const sizeIssues = results.filter((r) => r.issues.some((i) => i.issue === 'size'));

  // Find files with multiple issues
  const multiIssueFiles = results.filter((r) => r.issues.length > 1);

  // Print naming issues
  if (namingIssues.length > 0) {
    console.log(`${colors.yellow}Naming Convention Issues (${namingIssues.length})${colors.reset}`);
    namingIssues.forEach((result) => {
      const issue = result.issues.find((i) => i.issue === 'naming');
      const fileName = path.basename(result.filePath);

      // Generate specific suggested name based on the current name
      let suggestedName = fileName;

      if (fileName.includes('-') && issue.suggestion.includes('PascalCase')) {
        // Convert kebab-case to PascalCase
        suggestedName = fileName
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join('');

        // Handle file extension
        if (suggestedName.includes('.')) {
          const parts = suggestedName.split('.');
          const extension = parts.pop();
          suggestedName = parts.join('.') + '.' + extension;
        }
      } else if (issue.suggestion.includes('camelCase')) {
        // Convert to camelCase
        const parts = fileName.split('.');
        const extension = parts.pop();
        const baseName = parts.join('.');

        // Convert kebab-case or snake_case to camelCase
        const camelCaseName = baseName.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());
        suggestedName = camelCaseName + '.' + extension;
      } else if (
        fileName === 'index.tsx' ||
        fileName === 'context.tsx' ||
        fileName === 'types.ts' ||
        fileName === 'utils.ts'
      ) {
        // Special case for index files in component directories
        const dirName = path.basename(path.dirname(result.filePath));
        if (dirName && dirName.charAt(0) === dirName.charAt(0).toUpperCase()) {
          // If parent directory is already PascalCase, use it as prefix
          suggestedName = dirName + fileName.charAt(0).toUpperCase() + fileName.slice(1);
        } else if (dirName) {
          // Convert directory name to PascalCase and use as prefix
          const pascalDirName = dirName
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');
          suggestedName = pascalDirName + fileName.charAt(0).toUpperCase() + fileName.slice(1);
        }
      }

      console.log(
        `  ${colors.red}${result.filePath}${colors.reset} → Rename: ${fileName} to ${suggestedName}`,
      );
    });
    console.log('');
  }

  // Print location issues
  if (locationIssues.length > 0) {
    console.log(
      `${colors.yellow}Location Convention Issues (${locationIssues.length})${colors.reset}`,
    );
    locationIssues.forEach((result) => {
      const issue = result.issues.find((i) => i.issue === 'location');
      console.log(`  ${colors.red}${result.filePath}${colors.reset} → ${issue.suggestion}`);
    });
    console.log('');
  }

  // Print size issues
  if (sizeIssues.length > 0) {
    console.log(`${colors.yellow}File Size Issues (${sizeIssues.length})${colors.reset}`);
    sizeIssues.forEach((result) => {
      console.log(`  ${colors.red}${result.filePath}${colors.reset} (${result.lineCount} lines)`);
    });
    console.log('');
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
  console.log(`     - Components: PascalCase.tsx`);
  console.log(`     - Hooks: useFeature.ts`);
  console.log(`     - Utilities: camelCase.ts`);
  console.log(`     - Pages: page.tsx in kebab-case folders`);
  console.log(`     - Dynamic routes: [kebab-case].tsx`);
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
      console.log(
        `Run 'node scripts/refactor/refactor-analyzer.js' first to generate the analysis results.`,
      );
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

// Add new function for summary report
function generateSummaryReport(
  namingIssues,
  locationIssues,
  sizeIssues,
  multiIssueFiles,
  outputDir,
) {
  let summaryContent = `# Refactoring Summary Report\n\n`;
  summaryContent += `_Generated on ${new Date().toLocaleString()}_\n\n`;

  // Add summary statistics
  summaryContent += `## Overview\n\n`;
  summaryContent += `| Issue Type | Count |\n`;
  summaryContent += `| ---------- | ----- |\n`;
  summaryContent += `| Naming Convention | ${namingIssues.length} |\n`;
  summaryContent += `| Location Convention | ${locationIssues.length} |\n`;
  summaryContent += `| File Size | ${sizeIssues.length} |\n`;
  summaryContent += `| Multiple Issues | ${multiIssueFiles.length} |\n`;
  summaryContent += `| **Total Issues** | **${namingIssues.length + locationIssues.length + sizeIssues.length}** |\n\n`;

  // Add top naming issues (up to 10)
  if (namingIssues.length > 0) {
    summaryContent += `## Top Naming Issues (${Math.min(namingIssues.length, 10)} of ${namingIssues.length})\n\n`;
    summaryContent += `| File | Suggested Name |\n`;
    summaryContent += `| ---- | -------------- |\n`;

    namingIssues.slice(0, 10).forEach((result) => {
      const issue = result.issues.find((i) => i.issue === 'naming');
      const fileName = path.basename(result.filePath);

      // Generate specific suggested name based on the current name
      let suggestedName = fileName;

      if (fileName.includes('-') && issue.suggestion.includes('PascalCase')) {
        // Convert kebab-case to PascalCase
        suggestedName = fileName
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join('');

        // Handle file extension
        if (suggestedName.includes('.')) {
          const parts = suggestedName.split('.');
          const extension = parts.pop();
          suggestedName = parts.join('.') + '.' + extension;
        }
      } else if (issue.suggestion.includes('camelCase')) {
        // Convert to camelCase
        const parts = fileName.split('.');
        const extension = parts.pop();
        const baseName = parts.join('.');

        // Convert kebab-case or snake_case to camelCase
        const camelCaseName = baseName.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());
        suggestedName = camelCaseName + '.' + extension;
      } else if (
        fileName === 'index.tsx' ||
        fileName === 'context.tsx' ||
        fileName === 'types.ts' ||
        fileName === 'utils.ts'
      ) {
        // Special case for index files in component directories
        const dirName = path.basename(path.dirname(result.filePath));
        if (dirName && dirName.charAt(0) === dirName.charAt(0).toUpperCase()) {
          // If parent directory is already PascalCase, use it as prefix
          suggestedName = dirName + fileName.charAt(0).toUpperCase() + fileName.slice(1);
        } else if (dirName) {
          // Convert directory name to PascalCase and use as prefix
          const pascalDirName = dirName
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');
          suggestedName = pascalDirName + fileName.charAt(0).toUpperCase() + fileName.slice(1);
        }
      }

      // Use relative path for cleaner display
      const relativePath = result.filePath.replace(process.cwd() + '/', '');
      summaryContent += `| ${relativePath} | ${suggestedName} |\n`;
    });

    if (namingIssues.length > 10) {
      summaryContent += `\n_...and ${namingIssues.length - 10} more naming issues._\n`;
    }

    summaryContent += `\n`;
  }

  // Add top location issues (up to 10)
  if (locationIssues.length > 0) {
    summaryContent += `## Top Location Issues (${Math.min(locationIssues.length, 10)} of ${locationIssues.length})\n\n`;
    summaryContent += `| File | Suggested Location |\n`;
    summaryContent += `| ---- | ------------------ |\n`;

    locationIssues.slice(0, 10).forEach((result) => {
      const issue = result.issues.find((i) => i.issue === 'location');

      // Extract suggested location from the message
      let suggestedLocation = issue.suggestion;

      // Use relative path for cleaner display
      const relativePath = result.filePath.replace(process.cwd() + '/', '');
      summaryContent += `| ${relativePath} | ${suggestedLocation} |\n`;
    });

    if (locationIssues.length > 10) {
      summaryContent += `\n_...and ${locationIssues.length - 10} more location issues._\n`;
    }

    summaryContent += `\n`;
  }

  // Add top size issues (up to 20)
  if (sizeIssues.length > 0) {
    summaryContent += `## Top Size Issues (${Math.min(sizeIssues.length, 20)} of ${sizeIssues.length})\n\n`;
    summaryContent += `| File | Lines |\n`;
    summaryContent += `| ---- | ----- |\n`;

    // Sort by line count in descending order
    const sortedSizeIssues = [...sizeIssues].sort((a, b) => b.lineCount - a.lineCount);

    sortedSizeIssues.slice(0, 20).forEach((result) => {
      // Use relative path for cleaner display
      const relativePath = result.filePath.replace(process.cwd() + '/', '');
      summaryContent += `| ${relativePath} | ${result.lineCount} |\n`;
    });

    if (sizeIssues.length > 20) {
      summaryContent += `\n_...and ${sizeIssues.length - 20} more size issues._\n`;
    }

    summaryContent += `\n`;
  }

  // Add top multi-issue files (up to 10)
  if (multiIssueFiles.length > 0) {
    summaryContent += `## Files with Multiple Issues (${Math.min(multiIssueFiles.length, 10)} of ${multiIssueFiles.length})\n\n`;
    summaryContent += `| File | Type | Lines | Issues |\n`;
    summaryContent += `| ---- | ---- | ----- | ------ |\n`;

    multiIssueFiles.slice(0, 10).forEach((result) => {
      // Use relative path for cleaner display
      const relativePath = result.filePath.replace(process.cwd() + '/', '');
      summaryContent += `| ${relativePath} | ${result.fileType} | ${result.lineCount} | ${result.issues.map((i) => i.issue).join(', ')} |\n`;
    });

    if (multiIssueFiles.length > 10) {
      summaryContent += `\n_...and ${multiIssueFiles.length - 10} more files with multiple issues._\n`;
    }

    summaryContent += `\n`;
  }

  // Add refactoring strategy
  summaryContent += `## Refactoring Strategy\n\n`;
  summaryContent += `1. **Quick Fixes (Naming & Location)**\n`;
  summaryContent += `   - Fix naming convention issues first\n`;
  summaryContent += `   - Then address location issues\n`;
  summaryContent += `   - Commit after each batch of similar changes\n\n`;

  summaryContent += `2. **Complex Refactoring (File Size)**\n`;
  summaryContent += `   - Tackle one file at a time\n`;
  summaryContent += `   - Test thoroughly after each refactor\n`;
  summaryContent += `   - Commit after each file refactor\n\n`;

  summaryContent += `3. **General Rules**\n`;
  summaryContent += `   - Maximum 3 retries per task\n`;
  summaryContent += `   - Commit frequently\n`;
  summaryContent += `   - Run tests after significant changes\n\n`;

  summaryContent += `_For detailed reports, see:_\n`;
  summaryContent += `- [Naming & Location Issues](./refactor/refactor-result-naming-location.md)\n`;
  summaryContent += `- [Size Issues](./refactor/refactor-result-size.md)\n`;

  // Create scripts directory if it doesn't exist
  const scriptsDir = path.join(process.cwd(), 'scripts');
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }

  // Write the summary report to scripts folder
  fs.writeFileSync(path.join(scriptsDir, 'refactor-report.md'), summaryContent);
}
