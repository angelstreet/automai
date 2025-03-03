
  // Auto-fix script for unused variables and imports
  const fs = require('fs');
  const path = require('path');
  const glob = require('glob');
  
  // Find all TypeScript and JavaScript files in src directory
  const files = glob.sync('src/**/*.{ts,tsx,js,jsx}', {
    ignore: ['src/components/shadcn/**/*']
  });
  
  let fixedFiles = 0;
  
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Fix unused variables by prefixing with underscore
    const unusedVarRegex = /(?<!'[^']*?)\b(\w+)\b(?![^{]*})\s+is\s+(assigned|defined)\s+a\s+value\s+but\s+never\s+used/g;
    const matches = content.match(unusedVarRegex);
    
    if (matches && matches.length > 0) {
      matches.forEach(match => {
        const varName = match.match(/\b(\w+)\b/)[0];
        if (!varName.startsWith('_')) {
          const newVarName = '_' + varName;
          // Replace the variable name with prefixed version
          const regex = new RegExp('\\b' + varName + '\\b', 'g');
          content = content.replace(regex, newVarName);
          modified = true;
        }
      });
    }
    
    // Remove unused imports
    // This is handled by ESLint's --fix option for unused-imports/no-unused-imports
    
    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      fixedFiles++;
      console.log(`Fixed unused variables in ${file}`);
    }
  });
  
  console.log(`Automatically fixed ${fixedFiles} files with unused variables`);
  