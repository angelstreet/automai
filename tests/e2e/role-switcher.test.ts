import { navigateToPage, selectRole, getText } from '../setup';

describe('Role Switcher E2E', () => {
  beforeEach(async () => {
    await navigateToPage('/en/dashboard');
  });

  it('should change role when selected', async () => {
    await selectRole('developer');
    const roleText = await getText('[role="combobox"]');
    expect(roleText).toBe('Developer');

    await selectRole('tester');
    const updatedRoleText = await getText('[role="combobox"]');
    expect(updatedRoleText).toBe('Tester');
  });
}); 