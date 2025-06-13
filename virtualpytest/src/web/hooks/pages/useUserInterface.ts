/**
 * User Interface Hook
 *
 * This hook handles all user interface management functionality.
 */

import { useMemo } from 'react';

import { UserInterface, UserInterfaceCreatePayload } from '../../types/pages/UserInterface_Types';
import { buildServerUrl } from '../../utils/frontendUtils';

export const useUserInterface = () => {
  /**
   * Get all user interfaces
   */
  const getAllUserInterfaces = useMemo(
    () => async (): Promise<UserInterface[]> => {
      try {
        console.log(
          '[@hook:useUserInterface:getAllUserInterfaces] Fetching all user interfaces from server',
        );

        const response = await fetch(buildServerUrl('/server/userinterface/getAllUserInterfaces'));

        console.log(
          '[@hook:useUserInterface:getAllUserInterfaces] Response status:',
          response.status,
        );
        console.log(
          '[@hook:useUserInterface:getAllUserInterfaces] Response headers:',
          response.headers.get('content-type'),
        );

        if (!response.ok) {
          // Try to get error message from response
          let errorMessage = `Failed to fetch user interfaces: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.text();
            console.log(
              '[@hook:useUserInterface:getAllUserInterfaces] Error response body:',
              errorData,
            );

            // Check if it's JSON
            if (response.headers.get('content-type')?.includes('application/json')) {
              const jsonError = JSON.parse(errorData);
              errorMessage = jsonError.error || errorMessage;
            } else {
              // It's HTML or other content, likely a proxy/server issue
              if (errorData.includes('<!doctype') || errorData.includes('<html')) {
                errorMessage =
                  'Server endpoint not available. Make sure the Flask server is running on the correct port and the proxy is configured properly.';
              }
            }
          } catch {
            console.log(
              '[@hook:useUserInterface:getAllUserInterfaces] Could not parse error response',
            );
          }

          throw new Error(errorMessage);
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(
            `Expected JSON response but got ${contentType}. This usually means the Flask server is not running or the proxy is misconfigured.`,
          );
        }

        const userInterfaces = await response.json();
        console.log(
          `[@hook:useUserInterface:getAllUserInterfaces] Successfully loaded ${userInterfaces?.length || 0} user interfaces`,
        );
        return userInterfaces || [];
      } catch (error) {
        console.error(
          '[@hook:useUserInterface:getAllUserInterfaces] Error fetching user interfaces:',
          error,
        );
        throw error;
      }
    },
    [],
  );

  /**
   * Get a specific user interface by ID
   */
  const getUserInterface = useMemo(
    () =>
      async (id: string): Promise<UserInterface> => {
        try {
          console.log(
            `[@hook:useUserInterface:getUserInterface] Fetching user interface ${id} from server`,
          );

          const response = await fetch(
            buildServerUrl(`/server/userinterface/getUserInterface/${id}`),
          );
          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('User interface not found');
            }
            throw new Error(
              `Failed to fetch user interface: ${response.status} ${response.statusText}`,
            );
          }

          const userInterface = await response.json();
          console.log(
            `[@hook:useUserInterface:getUserInterface] Successfully loaded user interface: ${userInterface.name}`,
          );
          return userInterface;
        } catch (error) {
          console.error(
            `[@hook:useUserInterface:getUserInterface] Error fetching user interface ${id}:`,
            error,
          );
          throw error;
        }
      },
    [],
  );

  /**
   * Create a new user interface
   */
  const createUserInterface = useMemo(
    () =>
      async (payload: UserInterfaceCreatePayload): Promise<UserInterface> => {
        try {
          console.log(
            '[@hook:useUserInterface:createUserInterface] Creating user interface:',
            payload,
          );

          const response = await fetch(
            buildServerUrl('/server/userinterface/createUserInterface'),
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            },
          );

          const result = await response.json();

          if (!response.ok) {
            throw new Error(
              result.error ||
                `Failed to create user interface: ${response.status} ${response.statusText}`,
            );
          }

          if (result.status === 'success' && result.userinterface) {
            console.log(
              `[@hook:useUserInterface:createUserInterface] Successfully created user interface: ${result.userinterface.name}`,
            );
            return result.userinterface;
          } else {
            throw new Error(result.error || 'Failed to create user interface');
          }
        } catch (error) {
          console.error(
            '[@hook:useUserInterface:createUserInterface] Error creating user interface:',
            error,
          );
          throw error;
        }
      },
    [],
  );

  /**
   * Update an existing user interface
   */
  const updateUserInterface = useMemo(
    () =>
      async (id: string, payload: UserInterfaceCreatePayload): Promise<UserInterface> => {
        try {
          console.log(
            `[@hook:useUserInterface:updateUserInterface] Updating user interface ${id}:`,
            payload,
          );

          const response = await fetch(
            buildServerUrl(`/server/userinterface/updateUserInterface/${id}`),
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            },
          );

          const result = await response.json();

          if (!response.ok) {
            throw new Error(
              result.error ||
                `Failed to update user interface: ${response.status} ${response.statusText}`,
            );
          }

          if (result.status === 'success' && result.userinterface) {
            console.log(
              `[@hook:useUserInterface:updateUserInterface] Successfully updated user interface: ${result.userinterface.name}`,
            );
            return result.userinterface;
          } else {
            throw new Error(result.error || 'Failed to update user interface');
          }
        } catch (error) {
          console.error(
            `[@hook:useUserInterface:updateUserInterface] Error updating user interface ${id}:`,
            error,
          );
          throw error;
        }
      },
    [],
  );

  /**
   * Delete a user interface
   */
  const deleteUserInterface = useMemo(
    () =>
      async (id: string): Promise<void> => {
        try {
          console.log(`[@hook:useUserInterface:deleteUserInterface] Deleting user interface ${id}`);

          const response = await fetch(
            buildServerUrl(`/server/userinterface/deleteUserInterface/${id}`),
            {
              method: 'DELETE',
            },
          );

          const result = await response.json();

          if (!response.ok) {
            throw new Error(
              result.error ||
                `Failed to delete user interface: ${response.status} ${response.statusText}`,
            );
          }

          if (result.status === 'success') {
            console.log(
              `[@hook:useUserInterface:deleteUserInterface] Successfully deleted user interface ${id}`,
            );
          } else {
            throw new Error(result.error || 'Failed to delete user interface');
          }
        } catch (error) {
          console.error(
            `[@hook:useUserInterface:deleteUserInterface] Error deleting user interface ${id}:`,
            error,
          );
          throw error;
        }
      },
    [],
  );

  return {
    getAllUserInterfaces,
    getUserInterface,
    createUserInterface,
    updateUserInterface,
    deleteUserInterface,
  };
};
