// Cloudflare R2 configuration
const CLOUDFLARE_R2_PUBLIC_URL = 'https://pub-f6b0b2d9c3a04d8b8c5e9f7a2b1c3d4e.r2.dev';

/**
 * Builds the full Cloudflare R2 public URL for a screenshot
 * @param screenshotPath - The screenshot path (e.g., "virtualpytest/navigation/android_mobile/home.jpg" or just "home.jpg")
 * @param deviceModel - Optional device model to use if screenshotPath is just a filename (defaults to 'android_mobile')
 * @returns Full Cloudflare R2 public URL or undefined if no screenshot path provided
 */
export const buildScreenshotUrl = (
  screenshotPath: string | undefined, 
  deviceModel: string = 'android_mobile'
): string | undefined => {
  if (!screenshotPath) return undefined;
  
  // If it's already a full URL (local or Cloudflare), return as-is
  if (screenshotPath.startsWith('http://') || screenshotPath.startsWith('https://')) {
    return screenshotPath;
  }
  
  // If it's a relative path starting with virtualpytest/, use it directly
  if (screenshotPath.startsWith('virtualpytest/')) {
    return `${CLOUDFLARE_R2_PUBLIC_URL}/${screenshotPath}`;
  }
  
  // If it's just a filename, assume it's in the navigation folder structure
  return `${CLOUDFLARE_R2_PUBLIC_URL}/virtualpytest/navigation/${deviceModel}/${screenshotPath}`;
};

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
  } catch (error) {
    console.error('[@utils:cloudflareUtils:extractR2Path] Invalid URL:', cloudflareUrl);
    return null;
  }
}; 