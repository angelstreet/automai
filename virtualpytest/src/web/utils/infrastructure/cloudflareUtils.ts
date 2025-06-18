// Cloudflare R2 utility functions for URL handling

/**
 * Checks if a URL is a Cloudflare R2 URL
 * @param url - The URL to check
 * @returns True if the URL is a Cloudflare R2 URL
 */
export const isCloudflareR2Url = (url: string | undefined): boolean => {
  if (!url) return false;
  return url.includes('.r2.cloudflarestorage.com') || url.includes('r2.dev');
};

/**
 * Extracts the relative path from a Cloudflare R2 URL
 * @param cloudflareUrl - The full Cloudflare R2 URL
 * @returns The relative path within the R2 bucket
 */
export const extractR2Path = (cloudflareUrl: string): string | null => {
  if (!isCloudflareR2Url(cloudflareUrl)) return null;

  try {
    const url = new URL(cloudflareUrl);
    // Remove leading slash from pathname
    return url.pathname.substring(1);
  } catch {
    console.error('[@utils:cloudflareUtils:extractR2Path] Invalid URL:', cloudflareUrl);
    return null;
  }
};
