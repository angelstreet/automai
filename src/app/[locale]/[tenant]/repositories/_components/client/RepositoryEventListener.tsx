'use client';

import { useEffect } from 'react';
import { useRepository } from '@/hooks/useRepository';

// Event constants
export const RepositoryEvents = {
  // Data Refresh Events
  REFRESH_REPOSITORIES: 'REFRESH_REPOSITORIES',
  REPOSITORY_COUNT_UPDATED: 'REPOSITORY_COUNT_UPDATED',

  // UI Control Events
  REPOSITORY_DELETED: 'REPOSITORY_DELETED',
  REPOSITORY_ADDED: 'REPOSITORY_ADDED',

  // Workspace Events
  WORKSPACE_CHANGED: 'WORKSPACE_CHANGED',
  WORKSPACE_ITEM_ADDED: 'WORKSPACE_ITEM_ADDED',
  WORKSPACE_ITEM_REMOVED: 'WORKSPACE_ITEM_REMOVED',
};

export function RepositoryEventListener() {
  const { refetchRepositories } = useRepository();

  useEffect(() => {
    console.log('[@component:RepositoryEventListener] Setting up event listeners');

    const handleWorkspaceChange = async () => {
      console.log(
        '[@component:RepositoryEventListener] Workspace change detected, refreshing repositories',
      );
      await refetchRepositories();
    };

    const handleRefreshRepositories = async () => {
      console.log('[@component:RepositoryEventListener] Handling refresh repositories request');
      await refetchRepositories();
      // Signal that the refresh is complete
      window.dispatchEvent(new Event(RepositoryEvents.REPOSITORY_COUNT_UPDATED));
    };

    // Handle workspace item events (add/remove)
    const handleWorkspaceItemChange = async (event: CustomEvent) => {
      if (event.detail?.itemType === 'repository') {
        console.log(
          `[@component:RepositoryEventListener] Repository workspace mapping changed for repository ${event.detail.itemId}`,
        );
        await refetchRepositories();
      }
    };

    // Add event listeners
    window.addEventListener(RepositoryEvents.WORKSPACE_CHANGED, handleWorkspaceChange);
    window.addEventListener(RepositoryEvents.REFRESH_REPOSITORIES, handleRefreshRepositories);
    window.addEventListener(
      RepositoryEvents.WORKSPACE_ITEM_ADDED,
      handleWorkspaceItemChange as EventListener,
    );
    window.addEventListener(
      RepositoryEvents.WORKSPACE_ITEM_REMOVED,
      handleWorkspaceItemChange as EventListener,
    );

    // Cleanup
    return () => {
      window.removeEventListener(RepositoryEvents.WORKSPACE_CHANGED, handleWorkspaceChange);
      window.removeEventListener(RepositoryEvents.REFRESH_REPOSITORIES, handleRefreshRepositories);
      window.removeEventListener(
        RepositoryEvents.WORKSPACE_ITEM_ADDED,
        handleWorkspaceItemChange as EventListener,
      );
      window.removeEventListener(
        RepositoryEvents.WORKSPACE_ITEM_REMOVED,
        handleWorkspaceItemChange as EventListener,
      );
    };
  }, [refetchRepositories]);

  return null;
}
