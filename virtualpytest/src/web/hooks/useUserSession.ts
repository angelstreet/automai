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

    let userId = 'browser-user'; // Default fallback

    // Try to get user ID from browser storage
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('cached_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          userId = user.id || 'browser-user';
          console.log(`[@hook:useUserSession] Using user ID: ${userId}`);
        } catch (e) {
          console.log(`[@hook:useUserSession] Error parsing cached user, using fallback`);
        }
      } else {
        console.log(`[@hook:useUserSession] Using fallback user ID: ${userId}`);
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
