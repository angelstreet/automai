import { useState, useCallback } from 'react';

/**
 * Shared User Session Hook - Consistent User Identification
 *
 * Provides unified user identification for device control and tree locking systems.
 */
export const useUserSession = () => {
  // Get user ID from browser storage - this is our primary identifier
  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('cached_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          const id = user.id || 'browser-user';
          console.log(`[@hook:useUserSession] Using user ID: ${id}`);
          return id;
        } catch (e) {
          console.log(`[@hook:useUserSession] Error parsing cached user, using fallback`);
        }
      }
    }
    const fallbackId = 'browser-user';
    console.log(`[@hook:useUserSession] Using fallback user ID: ${fallbackId}`);
    return fallbackId;
  });

  // Generate a unique session ID for this browser session
  const [sessionId] = useState(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const id = `${userId}-${timestamp}-${random}`;
    console.log(`[@hook:useUserSession] Generated session ID: ${id}`);
    return id;
  });

  // Check if a lock belongs to our user
  const isOurLock = useCallback(
    (lockInfo: any): boolean => {
      if (!lockInfo) return false;

      // Handle different lock info formats
      const lockOwner =
        lockInfo.lockedBy || lockInfo.locked_by || lockInfo.session_id || lockInfo.user_id;

      const isOurs = lockOwner === userId;

      if (isOurs) {
        console.log(`[@hook:useUserSession] Lock belongs to current user: ${userId}`);
      } else {
        console.log(
          `[@hook:useUserSession] Lock belongs to different user: ${lockOwner} (current: ${userId})`,
        );
      }

      return isOurs;
    },
    [userId],
  );

  return {
    userId,
    sessionId,
    isOurLock,
  };
};
