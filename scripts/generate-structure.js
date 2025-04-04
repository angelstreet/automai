import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories to ignore
const IGNORE_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.cursor'];
// Files to ignore
const IGNORE_FILES = ['.DS_Store', 'tsconfig.tsbuildinfo'];

// Key directory types for providing contextual understanding
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

// Architecture patterns to detect
const PATTERNS = {
  serverComponent: (content) =>
    !content.includes("'use client'") && content.includes('export default'),
  clientComponent: (content) => content.includes("'use client'"),
  serverAction: (content) => content.includes("'use server'"),
  hook: (content) => content.match(/function\s+use[A-Z][a-zA-Z0-9]*\(/),
  contextProvider: (content) => content.includes('createContext') && content.includes('Provider'),
  typeDefinition: (content) =>
    content.includes('interface') || content.includes('type ') || content.includes('enum '),
};

async function extractFileInfo(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const ext = path.extname(filePath).toLowerCase();

    // Extract file purpose
    let purpose = '';
    let pattern = '';
    for (const [patternName, detector] of Object.entries(PATTERNS)) {
      if (detector(content)) {
        pattern = patternName;
        break;
      }
    }

    // Extract exports
    let exports = [];
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      try {
        const ast = parser.parse(content, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript'],
        });

        traverse.default(ast, {
          ExportNamedDeclaration(path) {
            if (path.node.declaration && path.node.declaration.id) {
              exports.push(path.node.declaration.id.name);
            }
          },
          ExportDefaultDeclaration(path) {
            exports.push('default');
          },
        });
      } catch (e) {
        // Parsing error - simplified export detection
        const exportMatches =
          content.match(
            /export\s+(const|function|class|interface|type|default)\s+([a-zA-Z0-9_]+)/g,
          ) || [];
        exports = exportMatches.map((match) => match.split(/\s+/).pop());
      }
    }

    // Get component/function name
    let name = path.basename(filePath, ext);

    // Extract imports
    const importMatches = content.match(/import\s+.+\s+from\s+['"]([@\./a-zA-Z0-9_-]+)['"]/g) || [];
    const imports = importMatches.map((match) => {
      const importPath = match.match(/from\s+['"]([^'"]+)['"]/)[1];
      return importPath;
    });

    // Extract JSDoc comments
    const jsdocComments = content.match(/\/\*\*\s*\n([^\*]|\*[^\/])*\*\//g) || [];
    const docSummary =
      jsdocComments.length > 0
        ? jsdocComments[0]
            .replace(/\/\*\*|\*\//g, '')
            .replace(/\s*\*\s*/g, ' ')
            .trim()
        : '';

    return {
      pattern,
      exports: exports.length > 0 ? exports : undefined,
      imports: imports.length > 0 ? imports : undefined,
      summary: docSummary || undefined,
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function getFileType(filePath, content) {
  const ext = path.extname(filePath).toLowerCase();

  if (['.ts', '.tsx'].includes(ext)) {
    if (filePath.includes('/components/')) return 'component';
    if (filePath.includes('/hooks/')) return 'hook';
    if (filePath.includes('/context/')) return 'context';
    if (filePath.includes('/types/')) return 'type definition';
    if (filePath.includes('/utils/')) return 'utility';
    if (filePath.includes('/api/')) return 'api';
    if (filePath.includes('/actions/')) return 'server action';
    if (filePath.includes('/lib/db/')) return 'database';
    return 'typescript';
  }

  if (['.js', '.jsx'].includes(ext)) return 'javascript';
  if (ext === '.json') return 'configuration';
  if (ext === '.md') return 'documentation';
  if (['.css', '.scss'].includes(ext)) return 'styles';
  if (ext === '.html') return 'html';

  return 'other';
}

async function generateStructure(dir, baseDir, relationships = {}, depth = 0) {
  const items = await fs.readdir(dir);
  const structure = {
    path: path.relative(baseDir, dir),
    type: 'directory',
    description: DIRECTORY_TYPES[path.basename(dir)] || '',
    children: [],
  };

  // Get directory-level package.json if it exists for context
  try {
    const pkgPath = path.join(dir, 'package.json');
    const pkgStat = await fs.stat(pkgPath).catch(() => null);
    if (pkgStat && pkgStat.isFile()) {
      const pkgContent = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
      structure.packageInfo = {
        name: pkgContent.name,
        description: pkgContent.description,
        dependencies: pkgContent.dependencies,
      };
    }
  } catch {}

  // Get index.ts/js file first if it exists for module context
  const indexFile = items.find((item) =>
    ['index.ts', 'index.js', 'index.tsx', 'index.jsx'].includes(item),
  );
  if (indexFile) {
    const indexPath = path.join(dir, indexFile);
    const indexInfo = await extractFileInfo(indexPath);
    if (indexInfo.exports && indexInfo.exports.length > 0) {
      structure.exports = indexInfo.exports;
    }
  }

  // Process all items
  for (const item of items) {
    if (IGNORE_DIRS.includes(item) || IGNORE_FILES.includes(item)) continue;

    const fullPath = path.join(dir, item);
    const itemStat = await fs.stat(fullPath);
    const relativePath = path.relative(baseDir, fullPath);

    if (itemStat.isDirectory()) {
      if (depth < 5) {
        // Limit recursion depth for large codebases
        const childStructure = await generateStructure(fullPath, baseDir, relationships, depth + 1);
        structure.children.push(childStructure);
      } else {
        structure.children.push({
          path: relativePath,
          type: 'directory',
          description: `Directory (depth limit reached)`,
        });
      }
    } else {
      // Skip processing for non-code files to improve performance
      const ext = path.extname(item).toLowerCase();
      const isCodeFile = ['.ts', '.tsx', '.js', '.jsx'].includes(ext);

      if (isCodeFile) {
        try {
          const content = await fs.readFile(fullPath, 'utf8');
          const fileType = await getFileType(fullPath, content);
          const fileInfo = await extractFileInfo(fullPath);

          // Build relationships between files
          if (fileInfo.imports) {
            relationships[relativePath] = relationships[relativePath] || { imports: [] };
            relationships[relativePath].imports = fileInfo.imports;
          }

          structure.children.push({
            path: relativePath,
            type: 'file',
            fileType,
            pattern: fileInfo.pattern,
            exports: fileInfo.exports,
            summary: fileInfo.summary,
          });
        } catch (error) {
          structure.children.push({
            path: relativePath,
            type: 'file',
            error: error.message,
          });
        }
      } else {
        structure.children.push({
          path: relativePath,
          type: 'file',
          fileType: path.extname(item).substring(1),
        });
      }
    }
  }

  return structure;
}

function findArchitecturalPatterns(structure, relationships) {
  const patterns = {
    serverComponents: [],
    clientComponents: [],
    hooks: [],
    contextProviders: [],
    serverActions: [],
    dataFlows: [],
    apiEndpoints: [],
  };

  // Extract patterns from structure
  function traverseForPatterns(node) {
    if (node.type === 'file') {
      if (node.pattern === 'serverComponent') patterns.serverComponents.push(node.path);
      if (node.pattern === 'clientComponent') patterns.clientComponents.push(node.path);
      if (node.pattern === 'hook') patterns.hooks.push(node.path);
      if (node.pattern === 'contextProvider') patterns.contextProviders.push(node.path);
      if (node.pattern === 'serverAction') patterns.serverActions.push(node.path);
      if (node.path.includes('/api/') && node.path.includes('route.'))
        patterns.apiEndpoints.push(node.path);
    }

    if (node.children) {
      node.children.forEach(traverseForPatterns);
    }
  }

  traverseForPatterns(structure);

  // Analyze data flows using relationships
  Object.keys(relationships).forEach((source) => {
    const imports = relationships[source].imports || [];
    imports.forEach((importPath) => {
      // Find potential data flow patterns
      if (importPath.includes('./hooks') || importPath.includes('@/hooks')) {
        patterns.dataFlows.push({
          from: importPath,
          to: source,
          type: 'hook usage',
        });
      }
      if (importPath.includes('./context') || importPath.includes('@/context')) {
        patterns.dataFlows.push({
          from: importPath,
          to: source,
          type: 'context usage',
        });
      }
      if (importPath.includes('./actions') || importPath.includes('@/actions')) {
        patterns.dataFlows.push({
          from: importPath,
          to: source,
          type: 'server action call',
        });
      }
    });
  });

  return patterns;
}

async function main() {
  try {
    const projectRoot = process.cwd();
    const packageJson = JSON.parse(
      await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8'),
    );

    // Prepare output content
    let content = `# Codebase Structure for ${packageJson.name}\n\n`;
    content += `## Project Overview\n\n`;
    content += `- **Name:** ${packageJson.name}\n`;
    content += `- **Version:** ${packageJson.version}\n`;
    content += `- **Description:** ${packageJson.description || 'No description provided'}\n\n`;

    // Add dependencies summary (as this is valuable context for AI)
    content += `## Core Dependencies\n\n`;
    content += `\`\`\`json\n${JSON.stringify(packageJson.dependencies, null, 2)}\n\`\`\`\n\n`;

    // Directory structure with relationships
    const relationships = {};
    const srcStructure = await generateStructure(
      path.join(projectRoot, 'src'),
      projectRoot,
      relationships,
    );
    const appStructure = await generateStructure(
      path.join(projectRoot, 'app'),
      projectRoot,
      relationships,
    ).catch(() => null);
    const pagesStructure = await generateStructure(
      path.join(projectRoot, 'pages'),
      projectRoot,
      relationships,
    ).catch(() => null);

    const projectStructure = {
      path: '/',
      type: 'directory',
      children: [srcStructure],
    };

    if (appStructure) projectStructure.children.push(appStructure);
    if (pagesStructure) projectStructure.children.push(pagesStructure);

    // Find architectural patterns
    const patterns = findArchitecturalPatterns(projectStructure, relationships);

    // Add architecture section
    content += `## Architectural Patterns\n\n`;

    if (patterns.serverComponents.length > 0) {
      content += `### Server Components (${patterns.serverComponents.length})\n\n`;
      content += patterns.serverComponents
        .slice(0, 10)
        .map((p) => `- \`${p}\``)
        .join('\n');
      if (patterns.serverComponents.length > 10)
        content += `\n- ... and ${patterns.serverComponents.length - 10} more`;
      content += '\n\n';
    }

    if (patterns.clientComponents.length > 0) {
      content += `### Client Components (${patterns.clientComponents.length})\n\n`;
      content += patterns.clientComponents
        .slice(0, 10)
        .map((p) => `- \`${p}\``)
        .join('\n');
      if (patterns.clientComponents.length > 10)
        content += `\n- ... and ${patterns.clientComponents.length - 10} more`;
      content += '\n\n';
    }

    if (patterns.hooks.length > 0) {
      content += `### Hooks (${patterns.hooks.length})\n\n`;
      content += patterns.hooks
        .slice(0, 10)
        .map((p) => `- \`${p}\``)
        .join('\n');
      if (patterns.hooks.length > 10) content += `\n- ... and ${patterns.hooks.length - 10} more`;
      content += '\n\n';
    }

    if (patterns.contextProviders.length > 0) {
      content += `### Context Providers (${patterns.contextProviders.length})\n\n`;
      content += patterns.contextProviders.map((p) => `- \`${p}\``).join('\n');
      content += '\n\n';
    }

    if (patterns.serverActions.length > 0) {
      content += `### Server Actions (${patterns.serverActions.length})\n\n`;
      content += patterns.serverActions
        .slice(0, 10)
        .map((p) => `- \`${p}\``)
        .join('\n');
      if (patterns.serverActions.length > 10)
        content += `\n- ... and ${patterns.serverActions.length - 10} more`;
      content += '\n\n';
    }

    if (patterns.apiEndpoints.length > 0) {
      content += `### API Endpoints (${patterns.apiEndpoints.length})\n\n`;
      content += patterns.apiEndpoints.map((p) => `- \`${p}\``).join('\n');
      content += '\n\n';
    }

    // Add directory structure in machine-readable format
    content += `## Directory Structure\n\n`;
    content += `\`\`\`json\n${JSON.stringify(projectStructure, null, 2)}\n\`\`\`\n\n`;

    // Add data flow information (most relevant for AI)
    content += `## Data Flow Patterns\n\n`;
    content += `\`\`\`json\n${JSON.stringify(patterns.dataFlows, null, 2)}\n\`\`\`\n\n`;

    // Add relationship graph information
    content += `## Key File Relationships\n\n`;
    content += `The following files have the most dependencies or are most depended upon:\n\n`;

    // Find key files with highest connectivity
    const fileConnectivity = {};
    Object.keys(relationships).forEach((file) => {
      fileConnectivity[file] = fileConnectivity[file] || 0;
      const imports = relationships[file].imports || [];
      imports.forEach((imp) => {
        fileConnectivity[imp] = (fileConnectivity[imp] || 0) + 1;
      });
      fileConnectivity[file] += imports.length;
    });

    // Sort by connectivity
    const keyFiles = Object.entries(fileConnectivity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([file, count]) => ({ file, connections: count }));

    content += `\`\`\`json\n${JSON.stringify(keyFiles, null, 2)}\n\`\`\`\n\n`;

    // Finalize and save
    const docsDir = path.join(projectRoot, '.cursor/rules');
    await fs.mkdir(docsDir, { recursive: true });

    const outputPath = path.join(docsDir, 'codebase-structure.mdc');
    await fs.writeFile(outputPath, content, 'utf8');
    console.log(`✅ AI-friendly codebase documentation generated at: ${outputPath}`);
  } catch (error) {
    console.error('Error generating codebase structure:', error);
    process.exit(1);
  }
}

main();
