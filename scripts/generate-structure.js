import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories to ignore
const IGNORE_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.cursor'];

// Files to ignore
const IGNORE_FILES = ['.DS_Store', 'tsconfig.tsbuildinfo'];

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch (error) {
    return 0;
  }
}

async function getFileType(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const ext = path.extname(filePath).toLowerCase();

    if (['.ts', '.tsx'].includes(ext)) return 'typescript';
    if (['.js', '.jsx'].includes(ext)) return 'javascript';
    if (ext === '.json') return 'json configuration';
    if (ext === '.md') return 'documentation';
    if (ext === '.css') return 'css';
    if (ext === '.scss') return 'scss';
    if (ext === '.html') return 'html';

    return 'other';
  } catch (error) {
    return 'binary/unknown';
  }
}

async function generateStructure(
  dir,
  level = 0,
  output = '',
  stats = { totalFiles: 0, totalLines: 0, byType: {} },
) {
  const items = await fs.readdir(dir);
  const indent = '  '.repeat(level);

  // Pre-fetch stats for all items to avoid await in sort
  const itemStats = await Promise.all(
    items.map(async (item) => {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      return { item, isDir: stat.isDirectory() };
    }),
  );

  const sortedItems = itemStats
    .sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.item.localeCompare(b.item);
    })
    .map((stat) => stat.item);

  for (const item of sortedItems) {
    if (IGNORE_DIRS.includes(item) || IGNORE_FILES.includes(item)) continue;

    const fullPath = path.join(dir, item);
    const itemStat = await fs.stat(fullPath);

    if (itemStat.isDirectory()) {
      output += `${indent}📁 ${item.toLowerCase()}/\n`;
      output += await generateStructure(fullPath, level + 1, '', stats);
    } else {
      const fileType = await getFileType(fullPath);
      const lineCount = countLines(fullPath);

      stats.totalFiles++;
      stats.totalLines += lineCount;
      stats.byType[fileType] = stats.byType[fileType] || { files: 0, lines: 0 };
      stats.byType[fileType].files++;
      stats.byType[fileType].lines += lineCount;

      output += `${indent}📄 ${item.toLowerCase()} (${fileType}, ${lineCount} lines)\n`;
    }
  }

  return output;
}

async function main() {
  try {
    const projectRoot = process.cwd();
    const srcPath = path.join(projectRoot, 'src');
    const projectName = path.basename(projectRoot).toLowerCase();

    let content = '';

    try {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8'),
      );
      content += `- **name:** ${packageJson.name.toLowerCase()}\n`;
      content += `- **version:** ${packageJson.version}\n`;
      content += `- **description:** ${(packageJson.description || 'no description provided').toLowerCase()}\n`;
      content += `\`\`\`bash\nnode scripts/generate-structure.js\n\`\`\`\n\n`;
    } catch (error) {
      content += `*package.json not found or invalid*\n\n`;
    }

    content += `# ${projectName} project structure\n\n`;
    content += `generated on: ${new Date().toLocaleString()}\n\n`;

    content += `## usage\n\n`;
    content += `to generate this documentation, run:\n\n`;
    content += `\`\`\`bash\n`;
    content += `# from the project root directory\n`;
    content += `node scripts/generate-structure.js\n`;
    content += `\`\`\`\n\n`;
    content += `this will create a new file at \`docs/project_structure.md\` containing the current project structure.\n\n`;

    const stats = {
      totalFiles: 0,
      totalLines: 0,
      byType: {},
    };

    content += `## project statistics\n\n`;
    content += `### overall statistics\n`;
    content += `- total files: calculating...\n`;
    content += `- total lines: calculating...\n\n`;

    content += `### statistics by file type\n`;
    content += `(statistics will be populated after directory scan)\n\n`;

    content += `## directory structure\n\n`;
    content += `\`\`\`\n`;
    content += await generateStructure(srcPath, 0, '', stats);
    content += `\`\`\`\n\n`;

    // Update statistics after scan
    content = content.replace(
      '- total files: calculating...',
      `- total files: ${stats.totalFiles}`,
    );
    content = content.replace(
      '- total lines: calculating...',
      `- total lines: ${stats.totalLines}`,
    );
    content = content.replace(
      '(statistics will be populated after directory scan)',
      Object.entries(stats.byType)
        .sort(([, a], [, b]) => b.lines - a.lines)
        .map(
          ([type, { files, lines }]) =>
            `#### ${type.toLowerCase()}\n- files: ${files}\n- lines: ${lines}\n- average lines per file: ${(lines / files).toFixed(2)}\n`,
        )
        .join('\n'),
    );

    const docsDir = path.join(projectRoot, 'docs');
    await fs.mkdir(docsDir, { recursive: true });

    const outputPath = path.join(projectRoot, 'docs', 'project_structure.md');
    await fs.writeFile(outputPath, content, 'utf8');
    console.log(`✅ project structure documentation generated at: ${outputPath}`);
  } catch (error) {
    console.error('error generating project structure:', error);
    process.exit(1);
  }
}

main();
