import { GitProviderType } from '@/app/[locale]/[tenant]/repositories/types';

/**
 * Validates if a URL is a valid Git repository URL
 * 
 * @param url Repository URL to validate
 * @returns Boolean indicating if the URL is valid
 */
export function isValidGitUrl(url: string): boolean {
  if (!url) return false;
  
  // Check if the URL ends with .git or contains .git/ (common for Git repository URLs)
  const hasGitExtension = url.endsWith('.git') || url.includes('.git/');
  
  // Check if it's a valid URL format
  try {
    // For http/https URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      new URL(url);
      return hasGitExtension;
    }
    
    // For SSH URLs (git@github.com:user/repo.git format)
    if (url.startsWith('git@')) {
      const sshRegex = /^git@[a-zA-Z0-9.-]+:[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+\.git$/;
      return sshRegex.test(url);
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Determines the Git provider type based on the repository URL
 * 
 * @param url Repository URL to analyze
 * @returns Provider type (github, gitlab, gitea, self-hosted) or null if not recognized
 */
export function detectProviderFromUrl(url: string): GitProviderType {
  if (!url) return 'self-hosted'; // Default fallback
  
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
    
    // Check for known Gitea instances
    if (
      normalizedUrl.includes('gitea.') ||
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
    
    // Check for IP-based URLs, which are likely self-hosted
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}/;
    if (ipRegex.test(normalizedUrl)) {
      return 'self-hosted';
    }
    
    // Default to self-hosted for any other URLs
    return 'self-hosted';
  } catch (e) {
    // If there's any error in parsing, default to self-hosted
    return 'self-hosted';
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
    
    // Regular HTTPS URLs (github.com/user/repo or self-hosted like 77.56.53.130:3000/user/repo)
    if (url.includes('://')) {
      const urlWithoutProtocol = url.replace(/^(https?:\/\/)/, '');
      const parts = urlWithoutProtocol.split('/');
      
      // Get the last part of the URL (the repository name)
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1] || parts[parts.length - 2] || '';
        return lastPart.replace(/\.git$/, '');
      }
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
    // Regular HTTPS URLs (github.com/user/repo or self-hosted like 77.56.53.130:3000/user/repo)
    if (url.includes('://')) {
      const urlWithoutProtocol = url.replace(/^(https?:\/\/)/, '');
      const parts = urlWithoutProtocol.split('/');
      
      // For self-hosted instances with port numbers (like 77.56.53.130:3000/user/repo)
      if (parts[0].includes(':')) {
        // If there's a port number, the owner should be parts[1]
        return parts.length >= 2 ? parts[1] : 'owner';
      }
      
      // For standard URLs (github.com/user/repo)
      return parts.length >= 2 ? parts[1] : 'owner';
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