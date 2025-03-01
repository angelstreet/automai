/**
 * Utility function to make authenticated API requests
 * Automatically adds the Authorization header with the access token from the session
 * Includes retry mechanism for server errors
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  retryConfig = { maxRetries: 3, initialDelay: 500, shouldRetry: false }
): Promise<Response> {
  const { maxRetries, initialDelay, shouldRetry } = retryConfig;
  let retries = 0;
  let delay = initialDelay;

  while (true) {
    try {
      // Get the CSRF token from the cookie
      const csrfToken = getCsrfToken();
      
      // Merge the headers with the Authorization header
      const headers = {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...options.headers,
      };

      // Make the request with the merged options
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Include cookies in the request
      });

      // If shouldRetry is true and we get a 500 error, retry the request
      if (shouldRetry && response.status === 500 && retries < maxRetries) {
        retries++;
        console.log(`Retrying fetch to ${url} (${retries}/${maxRetries}) after ${delay}ms delay...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }

      return response;
    } catch (error) {
      // If shouldRetry is true and we have retries left, retry on network errors
      if (shouldRetry && retries < maxRetries) {
        retries++;
        console.error(`Error in fetchWithAuth (retry ${retries}/${maxRetries}):`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      
      console.error('Error in fetchWithAuth:', error);
      throw error;
    }
  }
}

/**
 * Get the CSRF token from the cookie
 */
function getCsrfToken(): string | null {
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(cookie => cookie.trim().startsWith('XSRF-TOKEN='));
  
  if (csrfCookie) {
    return decodeURIComponent(csrfCookie.split('=')[1]);
  }
  
  return null;
} 