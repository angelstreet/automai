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
 * @returns The data from the server action or null if no data found
 * @throws Error if there's an actual error (not just no data)
 */
export async function actionFetcher<T>(
  action: (...args: any[]) => Promise<ActionResult<T>>,
  ...args: any[]
): Promise<T | null> {
  try {
    const response = await action(...args);

    if (!response.success) {
      // Check if this is a "no data found" scenario
      if (
        response.error?.toLowerCase().includes('not found') ||
        response.error?.toLowerCase().includes('no results') ||
        response.error?.toLowerCase().includes('no records') ||
        !response.data ||
        (Array.isArray(response.data) && response.data.length === 0)
      ) {
        // This is a valid "no data" scenario, return null without error
        return null;
      }

      // This is an actual error, throw it
      throw new Error(response.error || 'Failed to fetch data');
    }

    return response.data as T;
  } catch (error) {
    console.error('Action fetcher exception:', error);
    throw error; // Re-throw the error for SWR to handle
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
