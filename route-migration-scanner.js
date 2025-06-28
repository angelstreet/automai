#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Route patterns to find
const KEBAB_ROUTES = [
  'take-screenshot',
  'execute-command',
  'screenshot-and-dump',
  'get-apps',
  'take-control',
  'release-control',
  'get-stream-url',
  'get-status',
  'power-on',
  'power-off',
  'save-screenshot',
  'start-capture',
  'stop-capture',
];

const SNAKE_ROUTES = ['execute_batch', 'initialize_job', 'finalize_job'];

// File extensions to search
const EXTENSIONS = ['*.ts', '*.tsx', '*.js', '*.jsx', '*.py', '*.json', '*.md'];

console.log('🔍 ROUTE MIGRATION DEPENDENCY SCANNER');
console.log('=====================================');

let totalFound = 0;
const dependencies = {};

// Scan for kebab-case routes
console.log('\n📋 Scanning for kebab-case routes...');
KEBAB_ROUTES.forEach((route) => {
  console.log(`\n🔍 Searching for: ${route}`);

  EXTENSIONS.forEach((ext) => {
    try {
      const cmd = `find virtualpytest/src -name "${ext}" -exec grep -l "${route}" {} \\;`;
      const files = execSync(cmd, { encoding: 'utf8' }).trim();

      if (files) {
        files.split('\n').forEach((file) => {
          if (!dependencies[file]) dependencies[file] = [];
          dependencies[file].push(route);
          totalFound++;
          console.log(`   ✅ Found in: ${file}`);
        });
      }
    } catch (e) {
      // No matches found
    }
  });
});

// Scan for snake_case routes
console.log('\n📋 Scanning for snake_case routes...');
SNAKE_ROUTES.forEach((route) => {
  console.log(`\n🔍 Searching for: ${route}`);

  EXTENSIONS.forEach((ext) => {
    try {
      const cmd = `find virtualpytest/src -name "${ext}" -exec grep -l "${route}" {} \\;`;
      const files = execSync(cmd, { encoding: 'utf8' }).trim();

      if (files) {
        files.split('\n').forEach((file) => {
          if (!dependencies[file]) dependencies[file] = [];
          dependencies[file].push(route);
          totalFound++;
          console.log(`   ✅ Found in: ${file}`);
        });
      }
    } catch (e) {
      // No matches found
    }
  });
});

console.log('\n📊 SCAN RESULTS');
console.log('===============');
console.log(`Total route references found: ${totalFound}`);
console.log(`Files requiring updates: ${Object.keys(dependencies).length}`);

console.log('\n📋 FILES REQUIRING UPDATES:');
Object.entries(dependencies).forEach(([file, routes]) => {
  console.log(`\n📁 ${file}`);
  routes.forEach((route) => {
    console.log(`   🔸 ${route}`);
  });
});

// Generate update script
console.log('\n🚀 Generating update commands...');
const updateScript = Object.entries(dependencies)
  .map(([file, routes]) => {
    return routes
      .map((route) => {
        const camelCase = route
          .replace(/-([a-z])/g, (g) => g[1].toUpperCase())
          .replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        return `sed -i '' 's|${route}|${camelCase}|g' "${file}"`;
      })
      .join('\n');
  })
  .join('\n');

fs.writeFileSync('route-update-commands.sh', updateScript);
console.log('📝 Update commands written to: route-update-commands.sh');

console.log('\n✅ SCAN COMPLETE - Ready for migration!');
