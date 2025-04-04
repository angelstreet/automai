// migrate-translations.js - ES Module version
import fs from 'fs/promises';
import { createRequire } from 'module';

import { glob } from 'glob';

const require = createRequire(import.meta.url);

// Complete migration script
async function migrateTranslations() {
  console.log('Starting translation migration...');

  // Load translation files using require (simpler for JSON)
  const oldTranslations = require('./src/app/i18n/messages/en-old.json');
  const newTranslations = require('./src/app/i18n/messages/en.json');

  // Flatten nested objects for easier comparison
  function flattenObject(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, key) => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(acc, flattenObject(obj[key], newKey));
      } else {
        acc[newKey] = obj[key];
      }
      return acc;
    }, {});
  }

  const flatOldTranslations = flattenObject(oldTranslations);
  const flatNewTranslations = flattenObject(newTranslations);

  console.log(`Old translations: ${Object.keys(flatOldTranslations).length} keys`);
  console.log(`New translations: ${Object.keys(flatNewTranslations).length} keys`);

  // Create mapping between old and new keys
  const keyMapping = {};

  // Method 1: Map by exact value match
  console.log('Creating mapping by exact value match...');
  Object.entries(flatOldTranslations).forEach(([oldKey, oldValue]) => {
    const matchingNewEntries = Object.entries(flatNewTranslations).filter(
      ([_, newValue]) => newValue === oldValue,
    );

    if (matchingNewEntries.length === 1) {
      keyMapping[oldKey] = matchingNewEntries[0][0];
    }
  });

  // Method 2: Map by similar structure
  console.log('Creating mapping by similar key structure...');
  Object.keys(flatOldTranslations).forEach((oldKey) => {
    if (keyMapping[oldKey]) return; // Skip if already mapped

    // Convert camelCase to snake_case and check
    const convertedKey = oldKey
      .replace(/\.([a-z])/g, '.$1')
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase();

    const possibleNewKeys = Object.keys(flatNewTranslations).filter((newKey) => {
      const simplifiedOld = oldKey.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
      const simplifiedNew = newKey.toLowerCase();

      return (
        simplifiedNew.includes(simplifiedOld) ||
        simplifiedOld.includes(simplifiedNew) ||
        newKey.split('.').pop() === oldKey.split('.').pop() ||
        newKey.endsWith(oldKey.split('.').pop())
      );
    });

    if (possibleNewKeys.length === 1) {
      keyMapping[oldKey] = possibleNewKeys[0];
    }
  });

  // Method 3: Special case mappings for common patterns
  console.log('Adding special case mappings...');
  const specialMappings = {
    // Common mappings
    'common.name': 'common.name_label',
    'common.description': 'common.description_label',
    'common.type': 'common.type_label',
    'common.status': 'common.status_label',
    'common.created_at': 'common.created_at_label',
    'common.updated_at': 'common.updated_at_label',

    // Auth mappings
    'auth.signIn': 'auth.signin_title',
    'auth.signUp': 'auth.signup_title',
    'auth.email': 'auth.signin_email_label',
    'auth.password': 'auth.signin_password_label',
    'auth.confirmPassword': 'auth.signup_confirm_password_label',
    'auth.forgotPassword': 'auth.signin_forgot_password',
    'auth.rememberMe': 'auth.signin_remember_me',

    // Team mappings
    'team.memberName': 'team.members_name_label',
    'team.memberEmail': 'team.members_email_label',
    'team.memberRole': 'team.members_role_label',
    'team.memberStatus': 'team.members_status_label',
    'team.memberActions': 'team.members_actions_label',

    // Repository mappings
    'repositories.repositories': 'repositories.title',
    'repositories.repositories_description': 'repositories.desc',

    // Add more mappings for common patterns...
  };

  // Add special mappings
  Object.entries(specialMappings).forEach(([oldKey, newKey]) => {
    if (!keyMapping[oldKey] && flatNewTranslations[newKey]) {
      keyMapping[oldKey] = newKey;
    }
  });

  // Save mapping to file for reference
  await fs.writeFile('translation-mapping.json', JSON.stringify(keyMapping, null, 2));
  console.log(
    `Created mapping for ${Object.keys(keyMapping).length} keys out of ${Object.keys(flatOldTranslations).length} total`,
  );

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
    Object.entries(keyMapping).forEach(([oldKey, newKey]) => {
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
  console.log(`Translation mapping saved to translation-mapping.json for reference.`);

  // Find unmapped keys that might need manual review
  const unmappedKeys = Object.keys(flatOldTranslations).filter((key) => !keyMapping[key]);

  if (unmappedKeys.length > 0) {
    await fs.writeFile('unmapped-keys.json', JSON.stringify(unmappedKeys, null, 2));
    console.log(`Warning: ${unmappedKeys.length} keys couldn't be automatically mapped.`);
    console.log('Unmapped keys saved to unmapped-keys.json for manual review.');
  }
}

// Run the migration
migrateTranslations().catch((err) => {
  console.error('Error during migration:', err);
  process.exit(1);
});
