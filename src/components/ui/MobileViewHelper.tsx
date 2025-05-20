'use client';

import { useEffect } from 'react';

import { useIsMobile } from '@/hooks/useMobile';

/**
 * MobileViewHelper - Adds mobile-specific CSS classes to the document without affecting core layout
 *
 * This component doesn't render anything, it just adds CSS classes and custom properties to
 * improve mobile responsiveness without breaking the existing layout.
 */
export function MobileViewHelper() {
  const isMobile = useIsMobile();

  useEffect(() => {
    console.log(
      `[@component:MobileViewHelper] Setting mobile view mode: ${isMobile ? 'mobile' : 'desktop'}`,
    );

    // Set document-level attributes for CSS targeting
    if (isMobile) {
      document.documentElement.classList.add('is-mobile-view');

      // Add any mobile-specific custom properties that don't affect desktop layout
      document.documentElement.style.setProperty('--mobile-padding', '0.5rem');
      document.documentElement.style.setProperty('--mobile-font-size-adjust', '0.9');
    } else {
      document.documentElement.classList.remove('is-mobile-view');

      // Reset any mobile-specific custom properties
      document.documentElement.style.removeProperty('--mobile-padding');
      document.documentElement.style.removeProperty('--mobile-font-size-adjust');
    }

    return () => {
      // Clean up on unmount
      document.documentElement.classList.remove('is-mobile-view');
      document.documentElement.style.removeProperty('--mobile-padding');
      document.documentElement.style.removeProperty('--mobile-font-size-adjust');
    };
  }, [isMobile]);

  // This component doesn't render anything
  return null;
}

export default MobileViewHelper;
