'use server';

import fs from 'fs/promises';
import path from 'path';

import simpleGit from 'simple-git';

interface GitStatusResult {
  success: boolean;
  status?: {
    modified: string[];
    created: string[];
    deleted: string[];
    staged: string[];
    current: string | null;
    ahead: number;
    behind: number;
    isClean: boolean;
  };
  error?: string;
}

interface GitCommitResult {
  success: boolean;
  commit?: {
    hash: string;
    message: string;
  };
  error?: string;
}

interface GitPushResult {
  success: boolean;
  error?: string;
}

export async function getGitStatus(repoId: string): Promise<GitStatusResult> {
  try {
    console.log('[@action:gitActions:getGitStatus] Getting status for repository:', repoId);

    if (!repoId) {
      return { success: false, error: 'Repository ID is required' };
    }

    // Get repository directory
    const repoDir = path.join(process.cwd(), 'temp', repoId);

    try {
      // Check if repository directory exists
      await fs.access(repoDir);
    } catch {
      return { success: false, error: 'Repository not found' };
    }

    const git = simpleGit(repoDir);

    // Get git status
    const status = await git.status();

    console.log('[@action:gitActions:getGitStatus] Git status retrieved:', {
      modified: status.modified.length,
      created: status.created.length,
      deleted: status.deleted.length,
      staged: status.staged.length,
    });

    return {
      success: true,
      status: {
        modified: status.modified,
        created: status.created,
        deleted: status.deleted,
        staged: status.staged,
        current: status.current,
        ahead: status.ahead,
        behind: status.behind,
        isClean: status.isClean(),
      },
    };
  } catch (error: any) {
    console.error('[@action:gitActions:getGitStatus] Error getting git status:', error);
    return { success: false, error: 'Failed to get git status: ' + error.message };
  }
}

export async function commitChanges(
  repoId: string,
  message: string,
  modifiedFiles: { path: string; content: string }[],
): Promise<GitCommitResult> {
  try {
    console.log('[@action:gitActions:commitChanges] Starting commit for repository:', repoId);
    console.log('[@action:gitActions:commitChanges] Commit message:', message);
    console.log('[@action:gitActions:commitChanges] Modified files:', modifiedFiles.length);

    if (!repoId || !message.trim()) {
      return { success: false, error: 'Repository ID and commit message are required' };
    }

    // Get repository directory
    const repoDir = path.join(process.cwd(), 'temp', repoId);

    try {
      await fs.access(repoDir);
    } catch {
      return { success: false, error: 'Repository not found' };
    }

    // Write modified files to disk
    for (const file of modifiedFiles) {
      const filePath = path.join(repoDir, file.path);
      const fileDir = path.dirname(filePath);

      // Ensure directory exists
      await fs.mkdir(fileDir, { recursive: true });

      // Write file content
      await fs.writeFile(filePath, file.content, 'utf8');
      console.log('[@action:gitActions:commitChanges] Updated file on disk:', file.path);
    }

    const git = simpleGit(repoDir);

    // Add all modified files
    await git.add('.');
    console.log('[@action:gitActions:commitChanges] Files staged successfully');

    // Commit changes
    const commit = await git.commit(message);

    console.log('[@action:gitActions:commitChanges] Commit successful:', commit.commit);

    return {
      success: true,
      commit: {
        hash: commit.commit,
        message: message,
      },
    };
  } catch (error: any) {
    console.error('[@action:gitActions:commitChanges] Error committing changes:', error);
    return { success: false, error: 'Failed to commit changes: ' + error.message };
  }
}

export async function pushChanges(repoId: string): Promise<GitPushResult> {
  try {
    console.log('[@action:gitActions:pushChanges] Starting push for repository:', repoId);

    if (!repoId) {
      return { success: false, error: 'Repository ID is required' };
    }

    const repoDir = path.join(process.cwd(), 'temp', repoId);

    try {
      await fs.access(repoDir);
    } catch {
      return { success: false, error: 'Repository not found' };
    }

    const git = simpleGit(repoDir);

    // Push to remote
    await git.push('origin', 'HEAD');

    console.log('[@action:gitActions:pushChanges] Push successful');

    return { success: true };
  } catch (error: any) {
    console.error('[@action:gitActions:pushChanges] Error pushing changes:', error);

    // Provide more specific error messages
    let errorMessage = 'Failed to push changes: ' + error.message;

    if (error.message?.includes('authentication')) {
      errorMessage = 'Authentication failed. Please check your Git credentials.';
    } else if (error.message?.includes('permission')) {
      errorMessage = 'Permission denied. You may not have push access to this repository.';
    } else if (error.message?.includes('non-fast-forward')) {
      errorMessage = 'Push rejected. Please pull the latest changes first.';
    }

    return { success: false, error: errorMessage };
  }
}
