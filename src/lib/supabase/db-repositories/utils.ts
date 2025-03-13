import { GitProviderType } from '@/app/[locale]/[tenant]/repositories/types';

/**
 * Determines the Git provider type based on the repository URL
 * 
 * @param url Repository URL to analyze
 * @returns Provider type (github, gitlab, gitea) or null if not recognized
 */
export function detectProviderFromUrl(url: string): GitProviderType | null {
  if (!url) return null;
  
  try {
    // Normalize URL by removing protocol and any trailing slashes
    const normalizedUrl = url.toLowerCase()
      .replace(/^(https?:\/\/)/, '')
      .replace(/\/+$/, '');
    
    // Check for GitHub
    if (
      normalizedUrl.startsWith('github.com/') ||
      normalizedUrl.startsWith('www.github.com/')
    ) {
      return 'github';
    }
    
    // Check for GitLab
    if (
      normalizedUrl.startsWith('gitlab.com/') ||
      normalizedUrl.startsWith('www.gitlab.com/')
    ) {
      return 'gitlab';
    }
    
    // Check for Gitea - this is more difficult as Gitea can be hosted anywhere
    // We'll check for common Gitea paths and patterns
    if (
      normalizedUrl.includes('gitea.') ||
      // Add additional checks for your organizations' known Gitea instances
      normalizedUrl.includes('/gitea/')
    ) {
      return 'gitea';
    }
    
    // For git URLs
    if (url.startsWith('git@github.com:')) {
      return 'github';
    }
    
    if (url.startsWith('git@gitlab.com:')) {
      return 'gitlab';
    }
    
    // Fallback to GitHub if it contains github somewhere in the URL
    if (normalizedUrl.includes('github')) {
      return 'github';
    }
    
    // Fallback to GitLab if it contains gitlab somewhere in the URL
    if (normalizedUrl.includes('gitlab')) {
      return 'gitlab';
    }
    
    // Default to github if we can't determine the provider
    // This matches the current behavior
    return 'github';
  } catch (error) {
    console.error('Error detecting provider from URL:', error);
    return 'github'; // Default to GitHub
  }
}

/**
 * Extracts the repository name from a Git URL
 * 
 * @param url Repository URL
 * @returns Repository name without .git extension
 */
export function extractRepoNameFromUrl(url: string): string {
  if (!url) return 'repository';
  
  try {
    // Handle various URL formats
    
    // Regular HTTPS URLs (github.com/user/repo)
    if (url.includes('://')) {
      const parts = url.split('/');
      const lastPart = parts[parts.length - 1] || parts[parts.length - 2] || '';
      return lastPart.replace(/\.git$/, '');
    }
    
    // SSH URLs (git@github.com:user/repo.git)
    if (url.includes('@') && url.includes(':')) {
      const parts = url.split(':')[1]?.split('/') || [];
      const lastPart = parts[parts.length - 1] || '';
      return lastPart.replace(/\.git$/, '');
    }
    
    // Fallback to last path segment
    const segments = url.split('/');
    return (segments[segments.length - 1] || 'repository').replace(/\.git$/, '');
  } catch (error) {
    console.error('Error extracting repo name from URL:', error);
    return 'repository';
  }
}

/**
 * Extracts the owner (user or organization) from a Git URL
 * 
 * @param url Repository URL
 * @returns Repository owner
 */
export function extractOwnerFromUrl(url: string): string {
  if (!url) return 'owner';
  
  try {
    // Regular HTTPS URLs (github.com/user/repo)
    if (url.includes('://')) {
      const parts = url.replace(/^(https?:\/\/)/, '').split('/');
      if (parts.length >= 2) {
        return parts[1];
      }
    }
    
    // SSH URLs (git@github.com:user/repo.git)
    if (url.includes('@') && url.includes(':')) {
      const parts = url.split(':')[1]?.split('/') || [];
      if (parts.length >= 1) {
        return parts[0];
      }
    }
    
    return 'owner';
  } catch (error) {
    console.error('Error extracting owner from URL:', error);
    return 'owner';
  }
}