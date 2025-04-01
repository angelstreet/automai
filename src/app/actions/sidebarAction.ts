'use server';

import { cookies } from 'next/headers';
import { cache } from 'react';

import { SIDEBAR_COOKIE_NAME } from '@/components/sidebar/constants';

/**
 * Server action to get the sidebar state from cookies
 * Cached for better performance
 * @returns {Promise<boolean>} True if sidebar is expanded, false if collapsed
 */
export const getSidebarState = cache(async (): Promise<boolean> => {
  console.log(`[@action:sidebar:getSidebarState] Starting to fetch sidebar state from cookies`);

  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get(SIDEBAR_COOKIE_NAME);
  const isExpanded = sidebarCookie ? sidebarCookie.value !== 'false' : true;

  console.log(
    `[@action:sidebar:getSidebarState] Sidebar cookie: ${JSON.stringify({
      exists: !!sidebarCookie,
      value: sidebarCookie?.value,
      resolvedState: isExpanded ? 'expanded' : 'collapsed',
    })}`,
  );

  // Return boolean: true for expanded, false if collapsed
  // Default to true (expanded) if no cookie exists
  return isExpanded;
});

/**
 * Set sidebar state in cookies
 * Not cached since it's a WRITE operation
 */
export async function setSidebarState(isExpanded: boolean): Promise<void> {
  console.log(
    `[@action:sidebar:setSidebarState] Setting sidebar state to ${isExpanded ? 'expanded' : 'collapsed'}`,
  );

  const cookieStore = await cookies();
  cookieStore.set(SIDEBAR_COOKIE_NAME, String(isExpanded), {
    path: '/',
    sameSite: 'lax',
  });

  console.log(`[@action:sidebar:setSidebarState] Successfully set sidebar cookie`);
}
