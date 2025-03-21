import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { HostProvider, useHostContext } from '../HostContext';
import * as hostActions from '@/app/[locale]/[tenant]/hosts/actions';
import { UserProvider } from '@/context/UserContext';

// Mock the host actions
jest.mock('@/app/[locale]/[tenant]/hosts/actions', () => ({
  getHosts: jest.fn(),
  getHost: jest.fn(),
  createHost: jest.fn(),
  updateHost: jest.fn(),
  deleteHost: jest.fn(),
  testHostConnection: jest.fn(),
}));

// Mock the user context
jest.mock('@/context/UserContext', () => ({
  useUser: jest.fn().mockReturnValue({
    user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' }
  }),
  UserProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Test component that uses the host context
const TestComponent = () => {
  const { 
    hosts, 
    loadingStatus, 
    error, 
    isLoading,
    fetchHosts, 
    getHostById, 
    addHost,
    updateHostById,
    removeHost,
    testConnection 
  } = useHostContext();

  return (
    <div>
      <div data-testid="loading-state">{loadingStatus.state}</div>
      <div data-testid="loading-operation">{loadingStatus.operation || 'none'}</div>
      <div data-testid="error-message">{error ? error.message : 'no-error'}</div>
      <div data-testid="hosts-count">{hosts.length}</div>
      <button data-testid="fetch-hosts" onClick={() => fetchHosts()}>Fetch Hosts</button>
      <button data-testid="get-host" onClick={() => getHostById('test-id')}>Get Host</button>
      <button data-testid="add-host" onClick={() => addHost({ name: 'New Host', ip: '192.168.1.1', type: 'ssh' })}>Add Host</button>
      <button data-testid="update-host" onClick={() => updateHostById('test-id', { name: 'Updated Host' })}>Update Host</button>
      <button data-testid="remove-host" onClick={() => removeHost('test-id')}>Remove Host</button>
      <button data-testid="test-connection" onClick={() => testConnection('test-id')}>Test Connection</button>
      <div data-testid="is-loading-fetch">{isLoading('FETCH_ALL') ? 'true' : 'false'}</div>
    </div>
  );
};

describe('HostContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful host fetching by default
    (hostActions.getHosts as jest.Mock).mockResolvedValue({
      success: true,
      data: [
        { id: 'host-1', name: 'Host 1', ip: '192.168.1.1', type: 'ssh', status: 'connected' },
        { id: 'host-2', name: 'Host 2', ip: '192.168.1.2', type: 'ssh', status: 'disconnected' }
      ]
    });
    
    // Mock successful host retrieval by default
    (hostActions.getHost as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'host-1', name: 'Host 1', ip: '192.168.1.1', type: 'ssh', status: 'connected' }
    });
    
    // Mock successful host creation by default
    (hostActions.createHost as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'new-host-id', name: 'New Host', ip: '192.168.1.3', type: 'ssh', status: 'connected' }
    });
    
    // Mock successful host update by default
    (hostActions.updateHost as jest.Mock).mockResolvedValue({
      success: true
    });
    
    // Mock successful host deletion by default
    (hostActions.deleteHost as jest.Mock).mockResolvedValue({
      success: true
    });
    
    // Mock successful connection test by default
    (hostActions.testHostConnection as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Connection successful'
    });
  });

  it('provides initial state', () => {
    render(
      <UserProvider>
        <HostProvider>
          <TestComponent />
        </HostProvider>
      </UserProvider>
    );

    expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');
    expect(screen.getByTestId('error-message')).toHaveTextContent('no-error');
  });

  it('fetches hosts on initialization', async () => {
    render(
      <UserProvider>
        <HostProvider>
          <TestComponent />
        </HostProvider>
      </UserProvider>
    );

    await waitFor(() => {
      expect(hostActions.getHosts).toHaveBeenCalled();
      expect(screen.getByTestId('hosts-count')).toHaveTextContent('2');
      expect(screen.getByTestId('loading-state')).toHaveTextContent('success');
    });
  });

  it('handles errors when fetching hosts', async () => {
    (hostActions.getHosts as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Failed to fetch hosts'
    });

    render(
      <UserProvider>
        <HostProvider>
          <TestComponent />
        </HostProvider>
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to fetch hosts');
      expect(screen.getByTestId('loading-state')).toHaveTextContent('error');
    });
  });

  it('fetches hosts when clicking the fetch button', async () => {
    render(
      <UserProvider>
        <HostProvider>
          <TestComponent />
        </HostProvider>
      </UserProvider>
    );

    // Wait for initial load to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('success');
    });

    // Clear the mock and fetch again
    (hostActions.getHosts as jest.Mock).mockClear();
    
    // Click the fetch button
    act(() => {
      screen.getByTestId('fetch-hosts').click();
    });

    // Should show loading state for fetch operation
    expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');
    expect(screen.getByTestId('loading-operation')).toHaveTextContent('FETCH_ALL');
    expect(screen.getByTestId('is-loading-fetch')).toHaveTextContent('true');

    // Wait for fetch to complete
    await waitFor(() => {
      expect(hostActions.getHosts).toHaveBeenCalled();
      expect(screen.getByTestId('loading-state')).toHaveTextContent('success');
      expect(screen.getByTestId('is-loading-fetch')).toHaveTextContent('false');
    });
  });

  it('gets host by id when clicking the get host button', async () => {
    render(
      <UserProvider>
        <HostProvider>
          <TestComponent />
        </HostProvider>
      </UserProvider>
    );

    // Wait for initial load to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('success');
    });

    // Click the get host button
    act(() => {
      screen.getByTestId('get-host').click();
    });

    // Should show loading state for fetch operation
    expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');
    expect(screen.getByTestId('loading-operation')).toHaveTextContent('FETCH_ONE');

    // Wait for fetch to complete
    await waitFor(() => {
      expect(hostActions.getHost).toHaveBeenCalledWith('test-id', expect.anything());
      expect(screen.getByTestId('loading-state')).toHaveTextContent('success');
    });
  });

  it('adds a host when clicking the add host button', async () => {
    render(
      <UserProvider>
        <HostProvider>
          <TestComponent />
        </HostProvider>
      </UserProvider>
    );

    // Wait for initial load to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('success');
    });

    // Clear the getHosts mock to check if it's called after adding
    (hostActions.getHosts as jest.Mock).mockClear();

    // Click the add host button
    act(() => {
      screen.getByTestId('add-host').click();
    });

    // Should show loading state for create operation
    expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');
    expect(screen.getByTestId('loading-operation')).toHaveTextContent('CREATE');

    // Wait for add to complete
    await waitFor(() => {
      expect(hostActions.createHost).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Host', ip: '192.168.1.1', type: 'ssh' }),
        expect.anything()
      );
      expect(screen.getByTestId('loading-state')).toHaveTextContent('success');
      // Should fetch hosts after adding
      expect(hostActions.getHosts).toHaveBeenCalled();
    });
  });

  it('updates a host when clicking the update host button', async () => {
    render(
      <UserProvider>
        <HostProvider>
          <TestComponent />
        </HostProvider>
      </UserProvider>
    );

    // Wait for initial load to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('success');
    });

    // Clear the getHosts mock to check if it's called after updating
    (hostActions.getHosts as jest.Mock).mockClear();

    // Click the update host button
    act(() => {
      screen.getByTestId('update-host').click();
    });

    // Should show loading state for update operation
    expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');
    expect(screen.getByTestId('loading-operation')).toHaveTextContent('UPDATE');

    // Wait for update to complete
    await waitFor(() => {
      expect(hostActions.updateHost).toHaveBeenCalledWith(
        'test-id',
        expect.objectContaining({ name: 'Updated Host' }),
        expect.anything()
      );
      expect(screen.getByTestId('loading-state')).toHaveTextContent('success');
      // Should fetch hosts after updating
      expect(hostActions.getHosts).toHaveBeenCalled();
    });
  });

  it('removes a host when clicking the remove host button', async () => {
    render(
      <UserProvider>
        <HostProvider>
          <TestComponent />
        </HostProvider>
      </UserProvider>
    );

    // Wait for initial load to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('success');
    });

    // Clear the getHosts mock to check if it's called after removing
    (hostActions.getHosts as jest.Mock).mockClear();

    // Click the remove host button
    act(() => {
      screen.getByTestId('remove-host').click();
    });

    // Should show loading state for delete operation
    expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');
    expect(screen.getByTestId('loading-operation')).toHaveTextContent('DELETE');

    // Wait for remove to complete
    await waitFor(() => {
      expect(hostActions.deleteHost).toHaveBeenCalledWith('test-id', expect.anything());
      expect(screen.getByTestId('loading-state')).toHaveTextContent('success');
      // Should fetch hosts after removing
      expect(hostActions.getHosts).toHaveBeenCalled();
    });
  });

  it('tests connection when clicking the test connection button', async () => {
    render(
      <UserProvider>
        <HostProvider>
          <TestComponent />
        </HostProvider>
      </UserProvider>
    );

    // Wait for initial load to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('success');
    });

    // Click the test connection button
    act(() => {
      screen.getByTestId('test-connection').click();
    });

    // Should show loading state for test operation
    expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');
    expect(screen.getByTestId('loading-operation')).toHaveTextContent('TEST_CONNECTION');

    // Wait for test to complete
    await waitFor(() => {
      expect(hostActions.testHostConnection).toHaveBeenCalledWith('test-id', expect.anything());
      expect(screen.getByTestId('loading-state')).toHaveTextContent('success');
    });
  });
}); 