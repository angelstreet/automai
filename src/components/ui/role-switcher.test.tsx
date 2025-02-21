import { render, screen, fireEvent } from '@testing-library/react';
import { RoleSwitcher } from './role-switcher';

describe('RoleSwitcher', () => {
  const mockOnRoleChange = jest.fn();

  beforeEach(() => {
    mockOnRoleChange.mockClear();
  });

  it('renders with current role', () => {
    render(
      <RoleSwitcher
        currentRole="admin"
        onRoleChange={mockOnRoleChange}
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Administrator');
  });

  it('opens dropdown on click', () => {
    render(
      <RoleSwitcher
        currentRole="admin"
        onRoleChange={mockOnRoleChange}
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    
    // Check if all roles are displayed
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByText('Tester')).toBeInTheDocument();
    expect(screen.getByText('Viewer')).toBeInTheDocument();
  });

  it('calls onRoleChange when selecting a new role', () => {
    render(
      <RoleSwitcher
        currentRole="admin"
        onRoleChange={mockOnRoleChange}
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Developer'));

    expect(mockOnRoleChange).toHaveBeenCalledWith('developer');
  });

  it('filters roles when searching', () => {
    render(
      <RoleSwitcher
        currentRole="admin"
        onRoleChange={mockOnRoleChange}
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByPlaceholderText('Search role...'), {
      target: { value: 'dev' },
    });

    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.queryByText('Tester')).not.toBeInTheDocument();
  });
}); 