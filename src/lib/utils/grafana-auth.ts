/**
 * Utility functions for Grafana authentication
 */

/**
 * Verify if the user is authenticated with Grafana
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
export async function verifyGrafanaAuth(): Promise<boolean> {
  try {
    // First check localStorage for quick response
    const hasLocalAuth = localStorage.getItem('grafana-authenticated') === 'true';

    // If not authenticated in localStorage, no need to check the server
    if (!hasLocalAuth) {
      return false;
    }

    // Verify with the server
    const response = await fetch('/api/grafana-auth', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      // Clear local storage if server says we're not authenticated
      localStorage.removeItem('grafana-authenticated');
      return false;
    }

    const data = await response.json();

    if (!data.authenticated) {
      localStorage.removeItem('grafana-authenticated');
    }

    return data.authenticated;
  } catch (error) {
    console.error('[@utils:grafana-auth] Error verifying authentication:', error);
    return false;
  }
}

/**
 * Login to Grafana with username and password
 * @param {string} username - Grafana username
 * @param {string} password - Grafana password
 * @returns {Promise<{success: boolean, error?: string}>} Result of login attempt
 */
export async function loginToGrafana(
  username: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/grafana-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Store authentication in localStorage
      localStorage.setItem('grafana-authenticated', 'true');
      return { success: true };
    } else {
      return {
        success: false,
        error: data.error || 'Authentication failed',
      };
    }
  } catch (error) {
    console.error('[@utils:grafana-auth] Login error:', error);
    return {
      success: false,
      error: 'Connection error',
    };
  }
}

/**
 * Logout from Grafana
 */
export function logoutFromGrafana(): void {
  localStorage.removeItem('grafana-authenticated');
}
