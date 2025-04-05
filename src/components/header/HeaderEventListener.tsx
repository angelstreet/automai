'use client';

import { useEffect } from 'react';
import { useHeaderStore } from '@/store/headerStore';

// Define constants in an object to avoid Fast Refresh issues
const HeaderEvents = {
  // UI Control Events
  TOGGLE_HEADER_VISIBILITY: 'TOGGLE_HEADER_VISIBILITY', // Toggle header show/hide
};

// Export the constants object
export { HeaderEvents };

/**
 * CSS helper component that adds a class to the body element based on header state
 * This allows for global styling without direct DOM manipulation in components
 */
function HeaderCSSHelper() {
  const { isVisible } = useHeaderStore();

  useEffect(() => {
    console.log(
      `[@component:HeaderCSSHelper] Updating global CSS classes: header ${isVisible ? 'expanded' : 'collapsed'}`,
    );

    // Add class to body element for global styling
    if (isVisible) {
      document.body.classList.remove('header-collapsed');
      document.body.classList.add('header-expanded');
    } else {
      document.body.classList.remove('header-expanded');
      document.body.classList.add('header-collapsed');
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('header-expanded', 'header-collapsed');
    };
  }, [isVisible]);

  return null;
}

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

  // Render the CSS helper alongside the event listener
  return <HeaderCSSHelper />;
}
