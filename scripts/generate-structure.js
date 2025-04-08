import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MAX_DEPTH = 5;
const IMPORTANT_DIRS = ['db', 'client', 'components', 'api'];
const OUTPUT_FILE = 'codebase-structure.md';
const SOURCE_DIR = 'src';

// Function to get package information
async function getPackageInfo() {
  try {
    const packageJson = JSON.parse(await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf8'));
    return {
      name: packageJson.name || 'Unknown',
      description: packageJson.description || 'No description provided',
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {}
    };
  } catch (error) {
    console.error('Error reading package.json:', error.message);
    return {
      name: 'Unknown',
      description: 'Could not read package.json',
      dependencies: {},
      devDependencies: {}
    };
  }
}

// Scan directory recursively to build structure
async function scanDirectory(dirPath, depth = 0, maxDepth = MAX_DEPTH) {
  // For important directories, allow deeper scanning
  const dirName = path.basename(dirPath);
  const isImportantDir = IMPORTANT_DIRS.some(important => 
    dirPath.includes(`/${important}/`) || dirName === important);
  const effectiveMaxDepth = isImportantDir ? Math.max(maxDepth, 6) : maxDepth;
  
  if (depth > effectiveMaxDepth) {
    return { 
      name: path.basename(dirPath), 
      type: 'directory', 
      children: [],
      isMaxDepth: true
    };
  }
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const result = {
      name: path.basename(dirPath),
      type: 'directory',
      description: getDirectoryDescription(dirPath),
      children: []
    };
    
    // Process directories first
    const dirs = entries.filter(entry => entry.isDirectory() && !shouldIgnore(entry.name));
    for (const dir of dirs) {
      const childPath = path.join(dirPath, dir.name);
      const childResult = await scanDirectory(childPath, depth + 1, effectiveMaxDepth);
      result.children.push(childResult);
    }
    
    // Then process key files
    const files = entries.filter(entry => entry.isFile() && isKeyFile(entry.name));
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      result.children.push({
        name: file.name,
        type: 'file',
        fileType: getFileType(filePath)
      });
    }
    
    return result;
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
    return {
      name: path.basename(dirPath),
      type: 'directory',
      error: error.message,
      children: []
    };
  }
}

// Determine if a file or directory should be ignored
function shouldIgnore(name) {
  const IGNORE_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.cursor', '.github'];
  const IGNORE_FILES = ['.DS_Store', 'tsconfig.tsbuildinfo'];
  
  return IGNORE_DIRS.includes(name) || IGNORE_FILES.includes(name);
}

// Check if a file is a key file we want to include
function isKeyFile(fileName) {
  if (fileName.startsWith('.')) return false;
  
  const ext = path.extname(fileName).toLowerCase();
  
  // Include more file types for better coverage
  if (!['.ts', '.tsx', '.js', '.jsx', '.md', '.prisma', '.sql'].includes(ext)) return false;
  
  // Show more file types in important directories
  if (ext === '.tsx' || ext === '.jsx') return true; // Always show React components
  if (ext === '.prisma' || ext === '.sql') return true; // Always show database files
  
  // Include index files, config files, README files, types, and models
  return fileName === 'index.ts' || 
         fileName === 'index.js' || 
         fileName === 'README.md' || 
         fileName.includes('config') ||
         fileName.includes('type') ||
         fileName.includes('model') ||
         fileName.includes('schema') ||
         fileName.includes('client');
}

// Get a description for a directory based on its name
function getDirectoryDescription(dirPath) {
  const name = path.basename(dirPath);
  
  const DIRECTORY_TYPES = {
    components: 'UI components',
    hooks: 'React hooks for state management and logic',
    context: 'React context providers',
    providers: 'Service providers',
    utils: 'Utility functions',
    lib: 'Library code and services',
    actions: 'Server actions',
    api: 'API endpoints',
    types: 'TypeScript type definitions',
    _components: 'UI components specific to the parent feature',
    client: 'Client-side components',
  };
  
  return DIRECTORY_TYPES[name] || '';
}

// Determine file type based on name and path
function getFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);
  
  if (ext === '.md') return 'documentation';
  
  if (['.ts', '.tsx'].includes(ext)) {
    if (filePath.includes('/components/')) return 'component';
    if (filePath.includes('/hooks/')) return 'hook';
    if (filePath.includes('/context/')) return 'context';
    if (filePath.includes('/actions/')) return 'server action';
    if (filePath.includes('/api/')) return 'api';
    if (filePath.includes('/types/')) return 'type definition';
    return 'typescript';
  }
  
  if (['.js', '.jsx'].includes(ext)) return 'javascript';
  
  return 'other';
}

// Extract key features from the structure
function extractFeatures(structure) {
  const features = {
    mainFolders: [],
    components: [],
    apiRoutes: [],
    dataStores: [],
    serverActions: []
  };
  
  function traverse(node, path = '') {
    const currentPath = path ? `${path}/${node.name}` : node.name;
    
    if (node.type === 'directory') {
      // Top-level directories are main folders
      if (!path) {
        features.mainFolders.push({
          path: node.name,
          description: node.description
        });
      }
      
      // Identify feature directories
      if (node.name === 'components' || currentPath.includes('/components')) {
        features.components.push(currentPath);
      }
      
      if (node.name === 'api' || currentPath.includes('/api')) {
        features.apiRoutes.push(currentPath);
      }
      
      if (['context', 'store', 'providers'].includes(node.name) || 
          currentPath.includes('/context/') || 
          currentPath.includes('/store/') || 
          currentPath.includes('/providers/')) {
        features.dataStores.push(currentPath);
      }
      
      if (node.name === 'actions' || currentPath.includes('/actions')) {
        features.serverActions.push(currentPath);
      }
      
      // Traverse children
      if (node.children) {
        for (const child of node.children) {
          traverse(child, currentPath);
        }
      }
    }
  }
  
  traverse(structure);
  return features;
}

// Detect technologies used in the project
function detectTechnologies(packageInfo) {
  const allDeps = { ...packageInfo.dependencies, ...packageInfo.devDependencies };
  
  return {
    react: { used: !!allDeps.react, version: allDeps.react || '-' },
    nextjs: { used: !!allDeps.next, version: allDeps.next || '-' },
    typescript: { used: !!allDeps.typescript, version: allDeps.typescript || '-' },
    tailwind: { used: !!allDeps.tailwindcss, version: allDeps.tailwindcss || '-' },
    supabase: { used: !!allDeps['@supabase/supabase-js'], version: allDeps['@supabase/supabase-js'] || '-' },
    prisma: { used: !!allDeps.prisma, version: allDeps.prisma || '-' },
    trpc: { used: !!allDeps['@trpc/server'], version: allDeps['@trpc/server'] || '-' }
  };
}

// Generate markdown for directory structure
function formatDirectoryStructure(structure, indent = '') {
  let output = '';
  
  if (structure.type === 'directory') {
    const description = structure.description ? ` - ${structure.description}` : '';
    output += `${indent}📁 ${structure.name}${description}\n`;
    
    if (structure.children && structure.children.length > 0) {
      // First list subdirectories
      for (const child of structure.children) {
        if (child.type === 'directory') {
          output += formatDirectoryStructure(child, indent + '  ');
        }
      }
      
      // Then list files
      for (const child of structure.children) {
        if (child.type === 'file') {
          output += `${indent}  📄 ${child.name} (${child.fileType})\n`;
        }
      }
    }
  }
  
  return output;
}

// Main function
async function main() {
  console.log('Generating codebase structure documentation...');
  
  try {
    // Get package info
    const packageInfo = await getPackageInfo();
    
    // Scan the source directory
    const srcDir = path.join(process.cwd(), SOURCE_DIR);
    const structure = await scanDirectory(srcDir);
    
    // Extract features
    const features = extractFeatures(structure);
    
    // Detect technologies
    const technologies = detectTechnologies(packageInfo);
    
    // Generate markdown content
    let markdown = `# Codebase Structure Reference\n\n`;
    
    // Add technologies section
    markdown += `## Project Technologies\n\n`;
    markdown += `| Technology | Used | Version |\n`;
    markdown += `|------------|------|--------|\n`;
    
    for (const [tech, info] of Object.entries(technologies)) {
      markdown += `| ${tech} | ${info.used ? '✅' : '❌'} | ${info.version} |\n`;
    }
    
    // Add main features section
    markdown += `\n## Key Project Areas\n\n`;
    
    if (features.mainFolders.length > 0) {
      markdown += `### Main Folders\n\n`;
      for (const folder of features.mainFolders) {
        markdown += `- \`${folder.path}\`: ${folder.description || 'Main project folder'}\n`;
      }
      markdown += '\n';
    }
    
    if (features.components.length > 0) {
      markdown += `### UI Components\n\n`;
      for (const component of features.components) {
        markdown += `- \`${component}\`\n`;
      }
      markdown += '\n';
    }
    
    if (features.apiRoutes.length > 0) {
      markdown += `### API Routes\n\n`;
      for (const route of features.apiRoutes) {
        markdown += `- \`${route}\`\n`;
      }
      markdown += '\n';
    }
    
    if (features.dataStores.length > 0) {
      markdown += `### Data Stores\n\n`;
      for (const store of features.dataStores) {
        markdown += `- \`${store}\`\n`;
      }
      markdown += '\n';
    }
    
    if (features.serverActions.length > 0) {
      markdown += `### Server Actions\n\n`;
      for (const action of features.serverActions) {
        markdown += `- \`${action}\`\n`;
      }
      markdown += '\n';
    }
    
    // Add directory structure section
    markdown += `## Directory Structure\n\n\`\`\`\n`;
    markdown += formatDirectoryStructure(structure);
    markdown += `\`\`\`\n`;
    
    // Write the output file
    const outputPath = path.join(process.cwd(), 'docs', OUTPUT_FILE);
    const outputDir = path.dirname(outputPath);
    
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputPath, markdown);
    
    console.log(`Documentation generated successfully at ${outputPath}`);
  } catch (error) {
    console.error('Error generating documentation:', error);
    process.exit(1);
  }
}

// Run the main function
main();
