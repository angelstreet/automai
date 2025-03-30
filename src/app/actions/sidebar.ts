'use server';

import { cookies } from 'next/headers';
import { SIDEBAR_COOKIE_NAME } from '@/components/sidebar/constants';

/**
 * Server action to get the sidebar state from cookies
 * @returns {Promise<boolean>} True if sidebar is expanded, false if collapsed
 */
export async function getSidebarState(): Promise<boolean> {
  const cookieStore = cookies();
  const sidebarCookie = cookieStore.get(SIDEBAR_COOKIE_NAME);
  // Return boolean: true for expanded, false for collapsed
  // Default to true (expanded) if no cookie exists
  return sidebarCookie ? sidebarCookie.value !== 'false' : true;
}
