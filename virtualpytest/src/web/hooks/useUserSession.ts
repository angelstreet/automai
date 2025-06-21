import { useState, useCallback } from 'react';

// Singleton session data to prevent multiple instances
let globalSessionData: { userId: string; sessionId: string } | null = null;

/**
 * Shared User Session Hook - Consistent User Identification
 *
 * Provides unified user identification for device control and tree locking systems.
 */
export const useUserSession = () => {
  // Use singleton pattern to ensure only one session is created
  const [sessionData] = useState(() => {
    if (globalSessionData) {
      console.log(`[@hook:useUserSession] Using existing session: ${globalSessionData.sessionId}`);
      return globalSessionData;
    }

    // Use hardcoded default user ID for demo mode (no browser-user fallback)
    const DEFAULT_USER_ID = 'eb6cfd93-44ab-4783-bd0c-129b734640f3';
    let userId = DEFAULT_USER_ID;

    // Try to get user ID from browser storage if available (optional enhancement)
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('cached_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          if (user.id && user.id !== 'browser-user') {
            userId = user.id;
            console.log(`[@hook:useUserSession] Using stored user ID: ${userId}`);
          } else {
            console.log(
              `[@hook:useUserSession] Invalid stored user ID, using default: ${DEFAULT_USER_ID}`,
            );
          }
        } catch (e) {
          console.log(
            `[@hook:useUserSession] Failed to parse cached user, using default: ${DEFAULT_USER_ID}`,
          );
        }
      } else {
        console.log(
          `[@hook:useUserSession] No cached user found, using default: ${DEFAULT_USER_ID}`,
        );
      }
    }

    // Generate a stable session ID using the resolved userId
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const sessionId = `${userId}-${timestamp}-${random}`;

    console.log(`[@hook:useUserSession] Generated session ID: ${sessionId}`);

    // Store in singleton
    globalSessionData = {
      userId,
      sessionId,
    };

    return globalSessionData;
  });

  // Check if a lock belongs to our user
  const isOurLock = useCallback(
    (lockInfo: any): boolean => {
      if (!lockInfo) return false;

      // Handle different lock info formats
      const lockOwner =
        lockInfo.lockedBy || lockInfo.locked_by || lockInfo.session_id || lockInfo.user_id;

      const isOurs = lockOwner === sessionData.userId;

      if (isOurs) {
        console.log(`[@hook:useUserSession] Lock belongs to current user: ${sessionData.userId}`);
      } else {
        console.log(
          `[@hook:useUserSession] Lock belongs to different user: ${lockOwner} (current: ${sessionData.userId})`,
        );
      }

      return isOurs;
    },
    [sessionData.userId],
  );

  return {
    userId: sessionData.userId,
    sessionId: sessionData.sessionId,
    isOurLock,
  };
};
