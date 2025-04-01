'use server';

import { cookies } from 'next/headers';

import { SIDEBAR_COOKIE_NAME } from '@/components/sidebar/constants';

/**
 * Server action to get the sidebar state from cookies
 * @returns {Promise<boolean>} True if sidebar is expanded, false if collapsed
 */
export async function getSidebarState(): Promise<boolean> {
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
}
