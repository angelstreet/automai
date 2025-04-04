// enhanced-migration.js - ES Module version
import fs from 'fs/promises';
import { createRequire } from 'module';

import { glob } from 'glob';

const require = createRequire(import.meta.url);

async function enhancedMigration() {
  console.log('Starting enhanced translation migration...');

  // Load the complete mapping we created
  const completeMapping = require('../complete-translation-mapping.json');

  // Find and replace in code files
  console.log('Scanning codebase and replacing translation keys...');
  const codeFiles = await glob('src/**/*.{js,jsx,ts,tsx}', {
    ignore: ['**/node_modules/**', 'src/i18n/messages/**'],
  });

  let filesModified = 0;
  let replacementsCount = 0;

  for (const filePath of codeFiles) {
    let content = await fs.readFile(filePath, 'utf8');
    let modified = false;

    // Find t('key') and similar patterns
    Object.entries(completeMapping).forEach(([oldKey, newKey]) => {
      const escapedOldKey = oldKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Match different quote styles: t('key'), t("key"), t(`key`)
      const patterns = [
        new RegExp(`t\\((['"])${escapedOldKey}\\1`, 'g'), // t('key')
        new RegExp(`useTranslation\\((['"])${escapedOldKey}\\1`, 'g'), // useTranslation('key')
        new RegExp(`i18n\\.t\\((['"])${escapedOldKey}\\1`, 'g'), // i18n.t('key')
        new RegExp(`\\{t\\((['"])${escapedOldKey}\\1\\)\\}`, 'g'), // {t('key')}
        new RegExp(`t\\(\\s*(['"])${escapedOldKey}\\1`, 'g'), // t( 'key')
        new RegExp(`getTranslations\\((['"])${escapedOldKey}\\1`, 'g'), // getTranslations('key')
      ];

      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          const replacement = oldKey === newKey ? oldKey : newKey;
          content = content.replace(pattern, (match) => match.replace(oldKey, replacement));
          replacementsCount += matches.length;
          modified = true;
        }
      }
    });

    if (modified) {
      await fs.writeFile(filePath, content);
      filesModified++;
      console.log(`Updated: ${filePath}`);
    }
  }

  console.log(
    `Migration complete! Modified ${filesModified} files with ${replacementsCount} replacements.`,
  );
}

enhancedMigration().catch((err) => {
  console.error('Error during migration:', err);
  process.exit(1);
});
