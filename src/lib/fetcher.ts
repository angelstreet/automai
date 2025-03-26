/**
 * Fetcher utilities for SWR
 * This file provides generic fetcher functions for use with SWR
 */

import type { ActionResult } from '@/types/context/constants';

/**
 * Generic fetcher for server actions
 * Takes a server action function and its arguments, and returns the data
 *
 * @param action - The server action function to call
 * @param args - Arguments to pass to the server action
 * @returns The data from the server action or null if the action fails
 */
export async function actionFetcher<T>(
  action: (...args: any[]) => Promise<ActionResult<T>>,
  ...args: any[]
): Promise<T | null> {
  try {
    const response = await action(...args);

    if (!response.success) {
      console.error('Action fetcher error:', response.error || 'Failed to fetch data');
      return null;
    }

    return response.data as T;
  } catch (error) {
    console.error('Action fetcher exception:', error);
    return null;
  }
}

/**
 * Fetcher for API routes
 * Fetches data from a URL and returns the JSON response
 *
 * @param url - The URL to fetch data from
 * @returns The JSON response data or null if the fetch fails
 */
export async function apiFetcher<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`API fetcher error: ${response.statusText}`);
      return null;
    }

    return response.json() as Promise<T>;
  } catch (error) {
    console.error('API fetcher exception:', error);
    return null;
  }
}
