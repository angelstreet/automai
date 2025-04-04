// add-missing-mappings.js - ES Module version
import fs from 'fs/promises';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

async function addMissingMappings() {
  // Load required files
  const oldTranslations = require('../src/i18n/messages/en-old.json');
  const newTranslations = require('../src/i18n/messages/en.json');
  const unmappedKeys = require('../unmapped-keys.json');

  // Flatten objects for easier mapping
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

  // Create manual mappings for all unmapped keys
  const manualMappings = {
    // Team related mappings
    'team.invitePending': 'team.members_status_pending',
    'team.team.resources.hosts': 'team.resources_hosts',
    'team.team.resources.repositories': 'team.resources_repositories',
    'team.permissions.view': 'team.permissions_view',
    'team.permissions.edit': 'team.permissions_edit',
    'team.permissions.select': 'permissions.select',
    'team.permissions.insert': 'permissions.insert',
    'team.permissions.update': 'permissions.update',
    'team.permissions.update_own': 'permissions.update_own',
    'team.permissions.delete_own': 'permissions.delete_own',
    'team.permissions.execute': 'permissions.execute',
    'team.resources.title': 'team.title',
    'team.resources.repositories': 'team.resources_repositories',
    'team.resources.hosts': 'team.resources_hosts',
    'team.membersTab.search': 'common.search',
    'team.membersTab.noMembers': 'team.members_none',
    'team.membersTab.noTeam': 'team.create_team',
    'team.membersTab.noSearchResults': 'team.members_add_no_results',
    'team.membersTab.unknownUser': 'common.unknown',
    'team.membersTab.noEmail': 'auth.error_email_required',
    'team.membersTab.defaultTeam': 'common.select',
    'team.membersTab.memberActions.changePermissions': 'common.edit',
    'team.membersTab.addMember.emailLabel': 'team.members_add_email_label',
    'team.membersTab.addMember.selectMembers': 'common.select',
    'team.membersTab.addMember.searchMembers': 'team.members_add_search_placeholder',
    'team.membersTab.addMember.selectedCount': 'team.members_add_selected_count',
    'team.membersTab.editPermissions.roleApplied': 'team.members_edit_role_applied',
    'team.membersTab.editPermissions.roleAppliedDesc': 'team.members_edit_role_applied',
    'team.membersTab.editPermissions.successDesc': 'team.members_edit_success_desc',
    'team.settings': 'team.settings',
    'team.tabs.resources': 'team.resources_repositories',

    // Permissions mappings
    'permissions.select': 'permissions.select',
    'permissions.insert': 'permissions.insert',
    'permissions.update': 'permissions.update',
    'permissions.update_own': 'permissions.update_own',
    'permissions.delete_own': 'permissions.delete_own',
    'permissions.execute': 'permissions.execute',

    // Host mappings
    'hosts.hosts': 'hosts.title',

    // Auth mappings
    'auth.orContinueWith': 'auth.signin_button',
    'auth.createAccount': 'auth.signup_button',
    'auth.signInToYourAccount': 'auth.signin_title',
    'auth.redirecting': 'common.loading',

    // Common mappings
    'common.edit': 'common.edit',
    'common.devices': 'common.settings',
    'common.hosts': 'hosts.title',
    'common.managehosts': 'hosts.desc',
    'common.nohosts': 'hosts.none_title',
    'common.failed': 'common.failed',
    'common.pending': 'common.pending',
    'common.never': 'hosts.never',
    'common.terminal': 'hosts.terminal',
    'common.settings': 'common.settings',
    'common.username': 'hosts.username_label',
    'common.password': 'hosts.password_label',
    'common.success.connected': 'hosts.success_connected',

    // Dashboard mappings
    'dashboard.title': 'dashboard.title',

    // Profile mappings
    'profile.title': 'profile.title',
    'profile.profileDescription': 'profile.desc',
    'profile.edit': 'profile.edit_button',
    'profile.save': 'profile.save_button',
    'profile.name': 'profile.name_label',

    // Menu mappings
    'menu.hosts': 'menu.hosts',
    'menu.repositories': 'menu.repositories',
    'menu.settings': 'menu.settings',

    // Repository mappings
    'repositories.connecting': 'repositories.connecting',
    'repositories.repository': 'repositories.repository_label',
    'repositories.loading': 'repositories.loading',
    'repositories.execute': 'repositories.execute',
    'repositories.terminal': 'repositories.terminal',
    'repositories.settings': 'repositories.settings',
    'repositories.never': 'repositories.never',

    // Settings mappings
    'settings.title': 'settings.title',
    'settings.accountSettings': 'settings.account_title',

    // CICD mappings
    'cicd.providers': 'cicd.providers_title',
    'cicd.provider_type': 'cicd.provider_type_label',
    'cicd.token': 'cicd.token_label',
    'cicd.connecting': 'cicd.connecting',
    'cicd.edit': 'common.edit',
    'cicd.delete_provider_confirmation': 'cicd.delete_provider_confirm',

    // Deployment mappings
    'deployment.wizard.descriptionLabel': 'deployment.wizard_desc_label',
    'deployment.wizard.repositoryLabel': 'deployment.wizard_repo_label',
    'deployment.wizard.loadingRepositories': 'deployment.wizard_loading_repos',
    'deployment.wizard.repositoryError': 'deployment.wizard_repo_error',
    'deployment.filter.failed': 'deployment.filter_failed',
    'deployment.details.view': 'deployment.details_view',

    // Deployments mappings
    'deployments.description': 'deployment.desc',
    'deployments.deployments_description': 'deployment.desc',
    'deployments.createDeploymentDescription': 'deployment.wizard_desc_placeholder',
    'deployments.status.pending': 'common.pending',
    'deployments.status.in_progress': 'deployment.wizard_creating',
    'deployments.status.failed': 'deployment.filter_failed',
    'deployments.status.cancelled': 'deployment.details_cancel',
  };

  // Load existing mapping if it exists
  let existingMapping = {};
  try {
    const mappingContent = await fs.readFile('translation-mapping.json', 'utf8');
    existingMapping = JSON.parse(mappingContent);
  } catch (err) {
    console.log('No existing mapping found, creating new one');
  }

  // Merge existing mapping with our manual mappings
  const completeMapping = { ...existingMapping, ...manualMappings };

  // Verify all mappings exist in the new translations
  let invalidMappings = [];
  Object.entries(manualMappings).forEach(([oldKey, newKey]) => {
    if (!flatNewTranslations[newKey]) {
      invalidMappings.push({ oldKey, newKey });
    }
  });

  if (invalidMappings.length > 0) {
    console.log('Warning: Some mapped keys do not exist in the new translations:');
    invalidMappings.forEach(({ oldKey, newKey }) => {
      console.log(`  '${oldKey}' mapped to non-existent key '${newKey}'`);
    });
  }

  // Save the updated mapping
  await fs.writeFile('complete-translation-mapping.json', JSON.stringify(completeMapping, null, 2));

  console.log(`Complete mapping created with ${Object.keys(completeMapping).length} keys`);
  console.log(`Original unmapped keys: ${unmappedKeys.length}`);
  console.log(`Manually mapped keys: ${Object.keys(manualMappings).length}`);
  console.log('Mapping saved to complete-translation-mapping.json');
}

addMissingMappings().catch((err) => {
  console.error('Error:', err);
});
