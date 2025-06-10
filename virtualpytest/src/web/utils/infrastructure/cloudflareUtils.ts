// Cloudflare R2 configuration from environment variables
const CLOUDFLARE_R2_PUBLIC_URL = (import.meta as any).env.VITE_CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-604f1a4ce32747778c6d5ac5e3100217.r2.dev';

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
  
  console.log(`[@utils:cloudflareUtils:buildScreenshotUrl] Input: ${screenshotPath}, Device: ${deviceModel}`);
  console.log(`[@utils:cloudflareUtils:buildScreenshotUrl] Using R2 URL: ${CLOUDFLARE_R2_PUBLIC_URL}`);
  
  // If it's already a full URL (local or Cloudflare), return as-is
  if (screenshotPath.startsWith('http://') || screenshotPath.startsWith('https://')) {
    console.log(`[@utils:cloudflareUtils:buildScreenshotUrl] Already full URL, returning as-is: ${screenshotPath}`);
    return screenshotPath;
  }
  
  // Handle local API URLs - extract filename from path parameter
  if (screenshotPath.includes('/server/virtualpytest/screen-definition/images?path=')) {
    try {
      const url = new URL(screenshotPath, 'http://localhost:5009');
      const pathParam = url.searchParams.get('path');
      if (pathParam) {
        const decodedPath = decodeURIComponent(pathParam);
        console.log(`[@utils:cloudflareUtils:buildScreenshotUrl] Extracted path from local URL: ${decodedPath}`);
        
        // Extract just the filename from the full path
        const filename = decodedPath.split('/').pop();
        if (filename) {
          const cloudflareUrl = `${CLOUDFLARE_R2_PUBLIC_URL}/navigation/${deviceModel}/${filename}`;
          console.log(`[@utils:cloudflareUtils:buildScreenshotUrl] Built Cloudflare URL from local path: ${cloudflareUrl}`);
          return cloudflareUrl;
        }
      }
    } catch (error) {
      console.error(`[@utils:cloudflareUtils:buildScreenshotUrl] Error parsing local URL: ${error}`);
    }
  }
  
  // If it's a relative path starting with virtualpytest/, use it directly
  if (screenshotPath.startsWith('virtualpytest/')) {
    const cloudflareUrl = `${CLOUDFLARE_R2_PUBLIC_URL}/${screenshotPath}`;
    console.log(`[@utils:cloudflareUtils:buildScreenshotUrl] Built URL for virtualpytest path: ${cloudflareUrl}`);
    return cloudflareUrl;
  }
  
  // If it's just a filename, use the navigation folder structure
  const cloudflareUrl = `${CLOUDFLARE_R2_PUBLIC_URL}/navigation/${deviceModel}/${screenshotPath}`;
  console.log(`[@utils:cloudflareUtils:buildScreenshotUrl] Built URL for filename: ${cloudflareUrl}`);
  return cloudflareUrl;
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