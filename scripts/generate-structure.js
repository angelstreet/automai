const fs = require('fs');
const path = require('path');
const util = require('util');

const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);

// Directories to ignore
const IGNORE_DIRS = [
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    '.cursor'
];

// Files to ignore
const IGNORE_FILES = [
    '.DS_Store',
    'tsconfig.tsbuildinfo'
];

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
        const content = fs.readFileSync(filePath, 'utf8');
        const ext = path.extname(filePath).toLowerCase();
        
        // Detect file type based on extension and content
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

async function generateStructure(dir, level = 0, output = '', stats = { totalFiles: 0, totalLines: 0, byType: {} }) {
    const items = await readdir(dir);
    const indent = '  '.repeat(level);

    // Sort items to show directories first, then files
    const sortedItems = items.sort((a, b) => {
        const aPath = path.join(dir, a);
        const bPath = path.join(dir, b);
        const aIsDir = fs.statSync(aPath).isDirectory();
        const bIsDir = fs.statSync(bPath).isDirectory();
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.localeCompare(b);
    });

    for (const item of sortedItems) {
        if (IGNORE_DIRS.includes(item) || IGNORE_FILES.includes(item)) continue;
        
        const fullPath = path.join(dir, item);
        const itemStat = await stat(fullPath);
        
        if (itemStat.isDirectory()) {
            output += `${indent}📁 ${item.toLowerCase()}/\n`;
            const result = await generateStructure(fullPath, level + 1, '', stats);
            output += result;
        } else {
            const fileType = await getFileType(fullPath);
            const lineCount = countLines(fullPath);
            
            // Update statistics
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
        
        // Start with project details at the very top
        let content = '';
        
        try {
            const packageJson = require(path.join(projectRoot, 'package.json'));
            content += `- **name:** ${packageJson.name.toLowerCase()}\n`;
            content += `- **version:** ${packageJson.version}\n`;
            content += `- **description:** ${(packageJson.description || 'no description provided').toLowerCase()}\n`;
            content += `\`\`\`bash\nnode scripts/generate-structure.js\n\`\`\`\n\n`;
        } catch (error) {
            content += `*package.json not found or invalid*\n\n`;
        }

        // Add title and generation timestamp after project details
        content += `# ${projectName} project structure\n\n`;
        content += `generated on: ${new Date().toLocaleString()}\n\n`;

        // Add usage instructions
        content += `## usage\n\n`;
        content += `to generate this documentation, run:\n\n`;
        content += `\`\`\`bash\n`;
        content += `# from the project root directory\n`;
        content += `node scripts/generate-structure.js\n`;
        content += `\`\`\`\n\n`;
        content += `this will create a new file at \`docs/project_structure.md\` containing the current project structure.\n\n`;
        
        // Statistics object to collect metrics
        const stats = {
            totalFiles: 0,
            totalLines: 0,
            byType: {}
        };

        content += `## project statistics\n\n`;
        content += `### overall statistics\n`;
        content += `- total files: ${stats.totalFiles}\n`;
        content += `- total lines: ${stats.totalLines}\n\n`;
        
        content += `### statistics by file type\n`;
        Object.entries(stats.byType)
            .sort(([, a], [, b]) => b.lines - a.lines)
            .forEach(([type, { files, lines }]) => {
                content += `#### ${type.toLowerCase()}\n`;
                content += `- files: ${files}\n`;
                content += `- lines: ${lines}\n`;
                content += `- average lines per file: ${(lines / files).toFixed(2)}\n\n`;
            });

        content += `## directory structure\n\n`;
        content += `\`\`\`\n`;
        content += await generateStructure(srcPath, 0, '', stats);
        content += `\`\`\`\n\n`;
        
        // Write the output - ensure the docs directory exists
        const docsDir = path.join(projectRoot, 'docs');
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }
        
        // Write to project_structure.md (lowercase)
        const outputPath = path.join(projectRoot, 'docs', 'project_structure.md');
        fs.writeFileSync(outputPath, content);
        console.log(`✅ project structure documentation generated at: ${outputPath}`);
        
    } catch (error) {
        console.error('error generating project structure:', error);
        process.exit(1);
    }
}

main(); 