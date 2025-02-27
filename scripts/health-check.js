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
      console.log(`\n${colors.cyan}=== Best Practices for Breaking Up Large Files ===${colors.reset}`);
      printBestPractices();
    }
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Print best practices for breaking up large files
function printBestPractices() {
  console.log(`
${colors.magenta}1. Components:${colors.reset}
   - Create a directory with the component name
   - Use index.tsx as the main component file
   - Name child components with PascalCase and place in the same directory
   - Example: Button/index.tsx, Button/ButtonIcon.tsx, Button/ButtonLabel.tsx

${colors.magenta}2. Pages:${colors.reset}
   - Create a _components directory for page-specific components
   - Extract sections into separate components
   - Move data fetching to separate files (actions.ts or api.ts)
   - Example: app/dashboard/_components/DashboardHeader.tsx

${colors.magenta}3. Constants:${colors.reset}
   - Group related constants in separate files by domain
   - Place in a constants directory organized by feature
   - Example: constants/auth.ts, constants/dashboard.ts

${colors.magenta}4. Utility Functions:${colors.reset}
   - Group by functionality in separate files
   - Create an index.ts file to re-export functions
   - Example: utils/string.ts, utils/date.ts, utils/index.ts

${colors.magenta}5. API Routes:${colors.reset}
   - Split validation logic into separate files
   - Move business logic to service layer
   - Keep route handlers focused on request/response handling
   - Example: app/api/users/validation.ts, lib/services/userService.ts

${colors.magenta}6. Naming Conventions:${colors.reset}
   - Parent components: ComponentName.tsx
   - Child components: ComponentNameSubpart.tsx
   - Utility files: camelCase.ts
   - Constants: UPPER_SNAKE_CASE for values, PascalCase for objects

${colors.magenta}7. Imports Organization:${colors.reset}
   - Group imports by: external libraries, internal modules, types, styles
   - Use absolute imports for cross-directory references
   - Use relative imports for files in the same directory

${colors.magenta}8. Hooks Organization:${colors.reset}
   - State declarations first
   - Derived state next
   - Event handlers next
   - Effects last
   - Return values in a single object
   - Example:
     ```
     function useFormState() {
       // State
       const [values, setValues] = useState({});
       
       // Derived state
       const isValid = Object.keys(values).length > 0;
       
       // Handlers
       const handleChange = () => {...};
       
       // Effects
       useEffect(() => {...}, []);
       
       return { values, isValid, handleChange };
     }
     ```
`);
}

// Run the script
main(); 