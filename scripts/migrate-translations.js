// scripts/next-intl-migrate.js - ES Module version
import fs from 'fs/promises';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

import { glob } from 'glob';

// Get current script directory and project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const require = createRequire(import.meta.url);

async function migrateTranslations() {
  console.log('Starting next-intl translation migration...');

  try {
    // Load mapping
    const mappingPath = path.join(projectRoot, 'complete-translation-mapping.json');
    const completeMapping = require(mappingPath);
    console.log(`Loaded mapping with ${Object.keys(completeMapping).length} keys`);

    // Group mappings by namespace
    const namespaceMap = {};
    for (const [oldKey, newKey] of Object.entries(completeMapping)) {
      const oldNamespace = oldKey.split('.')[0];
      const oldSubKey = oldKey.split('.').slice(1).join('.');
      const newNamespace = newKey.split('.')[0];
      const newSubKey = newKey.split('.').slice(1).join('.');

      if (!namespaceMap[oldNamespace]) {
        namespaceMap[oldNamespace] = {
          newNamespace,
          keys: {},
        };
      }

      namespaceMap[oldNamespace].keys[oldSubKey] = newSubKey;
    }

    console.log(`Organized mappings into ${Object.keys(namespaceMap).length} namespaces`);

    // Find code files, focusing especially on Next.js pages and components
    const codeFilesPattern = path.join(projectRoot, 'src/**/*.{ts,tsx,js,jsx}');
    const codeFiles = await glob(codeFilesPattern, {
      ignore: [
        path.join(projectRoot, 'src/**/node_modules/**'),
        path.join(projectRoot, 'src/i18n/messages/**'),
      ],
      dot: true,
    });

    console.log(`Found ${codeFiles.length} code files`);

    let filesModified = 0;
    let totalReplacements = 0;

    // Process files
    for (const filePath of codeFiles) {
      try {
        let content = await fs.readFile(filePath, 'utf8');
        let originalContent = content;
        let fileReplacements = 0;

        // Check if file uses getTranslations
        if (!/getTranslations|useTranslations|next-intl/i.test(content)) {
          continue;
        }

        console.log(`\nChecking ${filePath}`);

        // Look for t function calls after getTranslations assignment
        for (const oldNamespace in namespaceMap) {
          const { newNamespace, keys } = namespaceMap[oldNamespace];

          // Find getTranslations calls for this namespace
          const getTransPattern = new RegExp(
            `getTranslations\\(['"\`]${oldNamespace}['"\`]\\)`,
            'g',
          );
          const useTransPattern = new RegExp(
            `useTranslations\\(['"\`]${oldNamespace}['"\`]\\)`,
            'g',
          );

          if (getTransPattern.test(content) || useTransPattern.test(content)) {
            // If namespace is used, replace it
            if (oldNamespace !== newNamespace) {
              content = content.replace(
                new RegExp(`getTranslations\\(['"\`]${oldNamespace}['"\`]\\)`, 'g'),
                `getTranslations('${newNamespace}')`,
              );
              content = content.replace(
                new RegExp(`useTranslations\\(['"\`]${oldNamespace}['"\`]\\)`, 'g'),
                `useTranslations('${newNamespace}')`,
              );
              fileReplacements++;
              console.log(`  Replaced namespace '${oldNamespace}' with '${newNamespace}'`);
            }

            // Now replace the keys used with the t function
            for (const [oldSubKey, newSubKey] of Object.entries(keys)) {
              if (oldSubKey !== newSubKey) {
                // For t('key') pattern
                const tKeyPattern = new RegExp(`t\\(['"\`]${oldSubKey}['"\`]\\)`, 'g');
                const tKeyReplacement = `t('${newSubKey}')`;

                // For t('key', {params}) pattern
                const tKeyParamsPattern = new RegExp(`t\\(['"\`]${oldSubKey}['"\`],\\s*`, 'g');
                const tKeyParamsReplacement = `t('${newSubKey}', `;

                // Make replacements
                if (tKeyPattern.test(content) || tKeyParamsPattern.test(content)) {
                  const before = content;
                  content = content.replace(tKeyPattern, tKeyReplacement);
                  content = content.replace(tKeyParamsPattern, tKeyParamsReplacement);

                  if (before !== content) {
                    fileReplacements++;
                    console.log(`  Replaced key '${oldSubKey}' with '${newSubKey}'`);
                  }
                }
              }
            }
          }
        }

        // Save file if modified
        if (content !== originalContent) {
          await fs.writeFile(filePath, content);
          filesModified++;
          totalReplacements += fileReplacements;
          console.log(`✅ Updated ${filePath} (${fileReplacements} replacements)`);
        }
      } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`- Files modified: ${filesModified}`);
    console.log(`- Total replacements: ${totalReplacements}`);
  } catch (err) {
    console.error('Error during migration:', err);
  }
}

migrateTranslations().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
