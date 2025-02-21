import { render, screen } from '@testing-library/react';
import { RoleSwitcher } from './role-switcher';

describe('RoleSwitcher', () => {
  it('renders with current role', () => {
    render(
      <RoleSwitcher
        currentRole="admin"
        onRoleChange={() => {}}
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Administrator');
  });
}); 