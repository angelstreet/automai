#!/usr/bin/env node

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create temporary ESLint config file
const eslintConfigContent = `
import typescriptEslintParser from "@typescript-eslint/parser";
import typescriptEslintPlugin from "@typescript-eslint/eslint-plugin";
import prettierPlugin from "eslint-plugin-prettier";
import importPlugin from "eslint-plugin-import";
import unusedImportsPlugin from "eslint-plugin-unused-imports";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import reactPlugin from "eslint-plugin-react";

export default [
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    ignores: ["src/components/shadcn/*", "node_modules", ".next", "out", ".cursor", "docs", "public", "electron", "prisma", "scripts", "tailwind.config.ts", "tsconfig.json", "tsconfig.node.json"],
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    },
    plugins: {
      "@typescript-eslint": typescriptEslintPlugin,
      prettier: prettierPlugin,
      "react-refresh": reactRefreshPlugin,
      "unused-imports": unusedImportsPlugin,
      import: importPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
      react: reactPlugin
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "varsIgnorePattern": "^_", "argsIgnorePattern": "^_" }],
      "prettier/prettier": "error",
      "@typescript-eslint/no-namespace": "off",
      "react-refresh/only-export-components": "error",
      "react/react-in-jsx-scope": "off",
      "react/display-name": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        { vars: "all", varsIgnorePattern: "^_", args: "all", argsIgnorePattern: "^_" },
      ],
      "import/no-unresolved": "error",
      "import/named": "error",
      "import/default": "error",
      "import/namespace": "error",
      "import/no-absolute-path": "error",
      "import/no-self-import": "error",
      "import/no-cycle": "error",
      "import/no-useless-path-segments": "error",
      "import/no-relative-parent-imports": "off",
      "import/order": [
        "error",
        { groups: ["builtin", "external", "internal", "parent", "sibling", "index"], "newlines-between": "always", alphabetize: { order: "asc" } },
      ],
      "react-hooks/exhaustive-deps": "error",
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "import/no-duplicates": "error",
    },
    settings: {
      react: { version: "detect" },
      "import/resolver": { typescript: { alwaysTryTypes: true } },
    },
  },
];
`;

const configPath = path.join(process.cwd(), 'eslint.config.mjs');

try {
  // Write the config file
  fs.writeFileSync(configPath, eslintConfigContent, 'utf8');
  console.log('Created temporary ESLint config file at eslint.config.mjs');

  // First run ESLint to fix what it can automatically
  console.log('Running ESLint with fix option on src folder...');
  try {
    execSync('npx eslint "src/**/*.{ts,tsx,js,jsx}" --ignore-pattern "src/components/shadcn/*" --fix', { stdio: 'inherit' });
  } catch (error) {
    // Continue even if ESLint reports errors, as we'll try to fix them in the next step
    console.log('ESLint reported errors, attempting to fix unused variables...');
  }

  // Get ESLint output to parse errors
  const eslintOutput = spawnSync('npx', ['eslint', 'src/**/*.{ts,tsx,js,jsx}', '--ignore-pattern', 'src/components/shadcn/*', '--format', 'json'], { 
    shell: true,
    encoding: 'utf8'
  });

  let errors = [];
  try {
    errors = JSON.parse(eslintOutput.stdout);
  } catch (e) {
    console.log('Failed to parse ESLint output, falling back to direct file modification');
  }

  // Track files that need modification
  const filesToModify = new Map();

  // Process ESLint errors
  errors.forEach(fileResult => {
    const filePath = fileResult.filePath;
    
    if (!filesToModify.has(filePath)) {
      filesToModify.set(filePath, {
        content: fs.readFileSync(filePath, 'utf8'),
        unusedVars: [],
        unusedParams: []
      });
    }
    
    const fileInfo = filesToModify.get(filePath);
    
    fileResult.messages.forEach(message => {
      // Handle unused variables
      if (message.ruleId === '@typescript-eslint/no-unused-vars' || message.ruleId === 'unused-imports/no-unused-vars') {
        const match = message.message.match(/'([^']+)'\s+is\s+(assigned|defined)\s+a\s+value\s+but\s+never\s+used/);
        if (match) {
          const varName = match[1];
          if (!varName.startsWith('_') && !fileInfo.unusedVars.includes(varName)) {
            fileInfo.unusedVars.push(varName);
          }
        }
        
        // Handle unused parameters
        const paramMatch = message.message.match(/'([^']+)'\s+is\s+defined\s+but\s+never\s+used/);
        if (paramMatch) {
          const paramName = paramMatch[1];
          if (!paramName.startsWith('_') && !fileInfo.unusedParams.includes(paramName)) {
            fileInfo.unusedParams.push(paramName);
          }
        }
      }
    });
  });

  // Now modify the files
  let fixedCount = 0;
  
  filesToModify.forEach((fileInfo, filePath) => {
    let content = fileInfo.content;
    let modified = false;
    
    // Fix unused variables
    fileInfo.unusedVars.forEach(varName => {
      if (varName === 'React') return; // Skip React as it's often used implicitly
      
      // Find the variable declaration
      const varDeclarationPattern = new RegExp(`\\b(const|let|var)\\s+(${varName})\\b`, 'g');
      content = content.replace(varDeclarationPattern, (match, declarationType, name) => {
        modified = true;
        return `${declarationType} _${name}`;
      });
    });
    
    // Fix unused parameters
    fileInfo.unusedParams.forEach(paramName => {
      if (paramName === 'React') return; // Skip React
      
      // Function parameters in various contexts
      // This regex looks for the parameter name in function declarations, arrow functions, etc.
      const paramPattern = new RegExp(`(\\(|,|^|\\s)\\s*(${paramName})\\s*(,|\\)|:|=>|\\{)`, 'g');
      content = content.replace(paramPattern, (match, before, name, after) => {
        modified = true;
        return `${before}_${name}${after}`;
      });
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      fixedCount++;
      console.log(`Fixed unused variables in ${filePath}`);
    }
  });
  
  // If no files were fixed using the ESLint output, fall back to the direct file scanning method
  if (fixedCount === 0) {
    console.log('Falling back to direct file scanning method...');
    
    // Get a list of all TypeScript and JavaScript files in src directory
    const getAllFiles = function(dirPath, arrayOfFiles = []) {
      const files = fs.readdirSync(dirPath);
      
      files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
          if (file !== 'shadcn' && !dirPath.includes('shadcn')) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
          }
        } else {
          if (file.match(/\.(ts|tsx|js|jsx)$/)) {
            arrayOfFiles.push(path.join(dirPath, file));
          }
        }
      });
      
      return arrayOfFiles;
    };
    
    const srcFiles = getAllFiles(path.join(process.cwd(), 'src'));
    
    srcFiles.forEach(filePath => {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      // Run ESLint on this specific file to get errors
      const fileEslintOutput = spawnSync('npx', ['eslint', filePath, '--format', 'json'], { 
        shell: true,
        encoding: 'utf8'
      });
      
      let fileErrors = [];
      try {
        fileErrors = JSON.parse(fileEslintOutput.stdout);
      } catch (e) {
        return; // Skip if we can't parse the output
      }
      
      if (fileErrors.length === 0 || !fileErrors[0].messages) return;
      
      const unusedVars = [];
      const unusedParams = [];
      
      fileErrors[0].messages.forEach(message => {
        // Handle unused variables
        if (message.ruleId === '@typescript-eslint/no-unused-vars' || message.ruleId === 'unused-imports/no-unused-vars') {
          const match = message.message.match(/'([^']+)'\s+is\s+(assigned|defined)\s+a\s+value\s+but\s+never\s+used/);
          if (match) {
            const varName = match[1];
            if (!varName.startsWith('_') && !unusedVars.includes(varName) && varName !== 'React') {
              unusedVars.push(varName);
            }
          }
          
          // Handle unused parameters
          const paramMatch = message.message.match(/'([^']+)'\s+is\s+defined\s+but\s+never\s+used/);
          if (paramMatch) {
            const paramName = paramMatch[1];
            if (!paramName.startsWith('_') && !unusedParams.includes(paramName) && paramName !== 'React') {
              unusedParams.push(paramName);
            }
          }
        }
      });
      
      // Fix unused variables
      unusedVars.forEach(varName => {
        // Find the variable declaration
        const varDeclarationPattern = new RegExp(`\\b(const|let|var)\\s+(${varName})\\b`, 'g');
        content = content.replace(varDeclarationPattern, (match, declarationType, name) => {
          modified = true;
          return `${declarationType} _${name}`;
        });
      });
      
      // Fix unused parameters
      unusedParams.forEach(paramName => {
        // Function parameters in various contexts
        const paramPattern = new RegExp(`(\\(|,|^|\\s)\\s*(${paramName})\\s*(,|\\)|:|=>|\\{)`, 'g');
        content = content.replace(paramPattern, (match, before, name, after) => {
          modified = true;
          return `${before}_${name}${after}`;
        });
      });
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        fixedCount++;
        console.log(`Fixed unused variables in ${filePath}`);
      }
    });
  }
  
  console.log(`Automatically fixed ${fixedCount} files with unused variables`);
  
  // Run ESLint again to fix any remaining issues and verify our changes
  console.log('Running ESLint again to verify fixes...');
  try {
    execSync('npx eslint "src/**/*.{ts,tsx,js,jsx}" --ignore-pattern "src/components/shadcn/*" --fix', { stdio: 'inherit' });
    console.log('ESLint fix completed successfully');
  } catch (error) {
    console.log('Some linting errors remain after fixes. You may need to fix these manually.');
  }
} catch (error) {
  console.error('Error running script:', error.message);
  process.exit(1);
} finally {
  // Clean up the temporary config file
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
    console.log('Removed temporary ESLint config file');
  }
}
