'use client';

import { useEffect } from 'react';

// Define constants in an object to avoid Fast Refresh issues
const HeaderEvents = {
  // UI Control Events
  TOGGLE_HEADER_VISIBILITY: 'TOGGLE_HEADER_VISIBILITY', // Toggle header show/hide
};

// Export the constants object
export { HeaderEvents };

export default function HeaderEventListener() {
  useEffect(() => {
    // Handle header visibility toggle event
    const handleToggleVisibility = () => {
      console.log(
        '[@component:HeaderEventListener] TOGGLE_HEADER_VISIBILITY: Header visibility toggled',
      );
      // Any side effects that need to happen when header visibility changes
    };

    // Register event listeners
    window.addEventListener(HeaderEvents.TOGGLE_HEADER_VISIBILITY, handleToggleVisibility);

    // Debug message when component mounts
    console.log('[@component:HeaderEventListener] Setting up event listeners');

    // Clean up listeners
    return () => {
      console.log('[@component:HeaderEventListener] Removing event listeners');
      window.removeEventListener(HeaderEvents.TOGGLE_HEADER_VISIBILITY, handleToggleVisibility);
    };
  }, []);

  // Listener components don't render anything
  return null;
}
