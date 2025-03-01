/**
 * Utility function to make authenticated API requests
 * Automatically adds the Authorization header with the access token from the session
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
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

    return response;
  } catch (error) {
    console.error('Error in fetchWithAuth:', error);
    throw error;
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