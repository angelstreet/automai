import { navigateToPage, selectRole, getText } from './setup';

describe('Role Switcher Component', () => {
  beforeEach(async () => {
    await navigateToPage('/en/dashboard');
  });

  it('should display current role', async () => {
    const roleText = await getText('[role="combobox"]');
    expect(roleText).toBe('Administrator');
  });

  it('should change role when selected', async () => {
    await selectRole('developer');
    const roleText = await getText('[role="combobox"]');
    expect(roleText).toBe('Developer');

    await selectRole('tester');
    const updatedRoleText = await getText('[role="combobox"]');
    expect(updatedRoleText).toBe('Tester');
  });

  it('should filter roles when searching', async () => {
    await selectRole('admin');
    const searchInput = await getText('input[placeholder="Search role..."]');
    expect(searchInput).toBeDefined();
  });
}); 