#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Run ESLint to get the list of unused variables
function getUnusedVariables() {
  try {
    const output = execSync('npx next lint --format json', {
      stdio: ['pipe', 'pipe', 'pipe'],
    }).toString();
    return JSON.parse(output);
  } catch (error) {
    // If the command fails, try to extract the JSON from stderr
    if (error.stderr) {
      try {
        const stderrStr = error.stderr.toString();
        const jsonStartIndex = stderrStr.indexOf('[{');
        if (jsonStartIndex !== -1) {
          const jsonStr = stderrStr.substring(jsonStartIndex);
          return JSON.parse(jsonStr);
        }
      } catch (e) {
        console.error('Failed to parse ESLint output:', e);
      }
    }
    console.error('Failed to run ESLint:', error.message);
    return [];
  }
}

// Function to fix unused variables in a file
function fixUnusedVarsInFile(filePath, unusedVars) {
  if (!unusedVars || unusedVars.length === 0) return;

  console.log(`Fixing unused variables in ${filePath}`);

  // Read the file content
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Track line offsets as we modify the file
  let lineOffsets = Array(lines.length).fill(0);

  // Sort warnings by line number in descending order to avoid offset issues
  unusedVars.sort((a, b) => b.line - a.line);

  // Process each unused variable warning
  for (const warning of unusedVars) {
    const lineIndex = warning.line - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) continue;

    const line = lines[lineIndex];
    let varName = null;

    // Extract variable name from warning message
    const match = warning.message.match(
      /['']([^'']*)[''] is (defined|assigned a value) but never used/,
    );
    if (match) {
      varName = match[1];
    }

    if (!varName) continue;

    // Check if it's a destructuring assignment
    if (line.includes('{') && line.includes('}')) {
      // Handle destructuring
      const beforeBrace = line.substring(0, line.indexOf('{'));
      const afterBrace = line.substring(line.indexOf('}') + 1);
      const destructuredPart = line.substring(line.indexOf('{') + 1, line.indexOf('}'));

      // Split by commas and find the variable
      const parts = destructuredPart.split(',').map((p) => p.trim());
      const newParts = parts.filter((p) => !p.includes(varName));

      if (newParts.length === 0) {
        // If all variables are removed, remove the entire line
        lines[lineIndex] = '';
      } else if (newParts.length < parts.length) {
        // Rebuild the line without the unused variable
        lines[lineIndex] = `${beforeBrace}{ ${newParts.join(', ')} }${afterBrace}`;
      }
    }
    // Check if it's a function parameter
    else if (line.includes('(') && line.includes(')')) {
      // Handle function parameters
      const funcMatch = line.match(/\(([^)]*)\)/);
      if (funcMatch) {
        const params = funcMatch[1].split(',').map((p) => p.trim());
        const newParams = params.filter(
          (p) => !p.startsWith(varName) && !p.startsWith(`${varName}:`),
        );

        if (newParams.length < params.length) {
          // Rebuild the function signature without the unused parameter
          const newLine = line.replace(funcMatch[0], `(${newParams.join(', ')})`);
          lines[lineIndex] = newLine;
        }
      }
    }
    // Handle simple variable declarations
    else if (line.includes('const') || line.includes('let') || line.includes('var')) {
      // Check if it's a multi-variable declaration
      if (line.includes(',')) {
        const declarationMatch = line.match(/(const|let|var)\s+(.*)/);
        if (declarationMatch) {
          const declaration = declarationMatch[1];
          const variables = declarationMatch[2].split(',').map((v) => v.trim());
          const newVariables = variables.filter(
            (v) => !v.startsWith(varName) && !v.startsWith(`${varName} =`),
          );

          if (newVariables.length === 0) {
            // If all variables are removed, remove the entire line
            lines[lineIndex] = '';
          } else if (newVariables.length < variables.length) {
            // Rebuild the line without the unused variable
            lines[lineIndex] = `${declaration} ${newVariables.join(', ')}`;
          }
        }
      } else {
        // Single variable declaration - remove the entire line
        if (line.includes(`${varName} =`) || line.includes(`${varName}:`)) {
          lines[lineIndex] = '';
        }
      }
    }
  }

  // Remove empty lines (but keep line structure for error reporting)
  const newContent = lines.join('\n');

  // Write the updated content back to the file
  fs.writeFileSync(filePath, newContent, 'utf8');
}

// Main function
function main() {
  const lintResults = getUnusedVariables();

  if (!lintResults || lintResults.length === 0) {
    console.log('No lint results found or no unused variables detected.');
    return;
  }

  // Process each file with unused variable warnings
  for (const result of lintResults) {
    const filePath = result.filePath;
    const messages = result.messages;

    // Filter for unused variable warnings
    const unusedVars = messages.filter(
      (msg) =>
        (msg.ruleId === '@typescript-eslint/no-unused-vars' ||
          msg.ruleId === 'unused-imports/no-unused-vars') &&
        msg.message.includes('but never used'),
    );

    if (unusedVars.length > 0) {
      try {
        fixUnusedVarsInFile(filePath, unusedVars);
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
      }
    }
  }

  console.log('Finished fixing unused variables');
}

main();
