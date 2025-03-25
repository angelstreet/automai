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
 * @returns The data from the server action
 * @throws Error if the server action fails
 */
export async function actionFetcher<T>(
  action: (...args: any[]) => Promise<ActionResult<T>>,
  ...args: any[]
): Promise<T> {
  const response = await action(...args);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch data');
  }
  
  return response.data as T;
}

/**
 * Fetcher for API routes
 * Fetches data from a URL and returns the JSON response
 * 
 * @param url - The URL to fetch data from
 * @returns The JSON response data
 * @throws Error if the fetch request fails
 */
export async function apiFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }
  
  return response.json() as Promise<T>;
}