'use client';

import * as React from 'react';

// Keep the existing breakpoint to maintain layout compatibility
const MOBILE_BREAKPOINT = 768;

// Add additional breakpoints for future reference without changing existing behavior
export const BREAKPOINTS = {
  sm: 640,
  md: MOBILE_BREAKPOINT, // Match existing mobile breakpoint
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // Use the same breakpoint logic but improve implementation
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const onChange = () => {
      setIsMobile(mql.matches);
      console.log(
        `[@hook:useMobile] Screen size changed: ${mql.matches ? 'mobile' : 'desktop'} (width: ${window.innerWidth}px)`,
      );
    };

    mql.addEventListener('change', onChange);

    // Initial detection
    setIsMobile(mql.matches);

    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isMobile;
}

/**
 * Hook for detecting specific breakpoints without changing existing layout
 */
export function useBreakpoint(breakpoint: keyof typeof BREAKPOINTS) {
  const [isBelow, setIsBelow] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${BREAKPOINTS[breakpoint] - 1}px)`);

    const onChange = () => {
      setIsBelow(mql.matches);
    };

    mql.addEventListener('change', onChange);
    setIsBelow(mql.matches);

    return () => mql.removeEventListener('change', onChange);
  }, [breakpoint]);

  return !!isBelow;
}
