import { useTranslations } from 'next-intl';

import { useToast } from '@/components/shadcn/use-toast';
import {  Repository  } from '@/types/context/repositoryContextType';

interface RepositoryActionsProps {
  repositories?: Repository[];
  setSyncingRepoIds: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  setIsRefreshingAll: (value: boolean) => void;
  fetchRepositories?: () => Promise<void>;
  isRefreshingAll: boolean;
}

export function RepositoryActions({
  repositories,
  setSyncingRepoIds,
  setIsRefreshingAll,
  fetchRepositories,
  isRefreshingAll,
}: RepositoryActionsProps) {
  const { toast } = useToast();
  const t = useTranslations('repositories');

  // Handle refreshing all repositories
  const handleRefreshAll = async (): Promise<void> => {
    console.log('🔎 [DEBUG] handleRefreshAll: Starting function...');

    if (isRefreshingAll || !repositories || repositories.length === 0) {
      console.log(
        '🔎 [DEBUG] handleRefreshAll: Early return - isRefreshing:',
        isRefreshingAll,
        'repos:',
        repositories?.length,
      );
      return;
    }

    setIsRefreshingAll(true);
    console.log('🔎 [DEBUG] handleRefreshAll: Processing', repositories.length, 'repositories');

    try {
      console.log('🔎 [DEBUG] handleRefreshAll: Importing actions...');

      // Log what actions we're trying to import
      const actionPath = '@/app/[locale]/[tenant]/repositories/actions';
      console.log('🔎 [DEBUG] handleRefreshAll: Importing from path:', actionPath);

      // Import the test repository action and repository update action
      const actions = await import('@/app/[locale]/[tenant]/repositories/actions');
      console.log('🔎 [DEBUG] handleRefreshAll: Imported actions:', Object.keys(actions));

      const { testGitRepository, updateRepository, clearRepositoriesCache } = actions;

      if (!testGitRepository) {
        console.error('🔴 [DEBUG] handleRefreshAll: testGitRepository is undefined!');
      }

      if (!updateRepository) {
        console.error('🔴 [DEBUG] handleRefreshAll: updateRepository is undefined!');
      }

      if (!clearRepositoriesCache) {
        console.error('🔴 [DEBUG] handleRefreshAll: clearRepositoriesCache is undefined!');
      }

      console.log('🔎 [DEBUG] handleRefreshAll: Starting repository testing loop...');

      // Process each repository one by one
      for (const repo of repositories as Repository[]) {
        try {
          // Skip repositories without a URL
          if (!repo.url) {
            console.log(
              `🔶 [DEBUG] handleRefreshAll: Repository ${repo.id} has no URL, skipping test`,
            );
            continue;
          }

          // Update state to show this specific repo is syncing
          setSyncingRepoIds((prev) => ({ ...prev, [repo.id]: true }));

          // Create test data with the repository URL
          const testData = {
            url: repo.url,
            token: repo.provider?.access_token || '',
          };

          console.log(
            `🔎 [DEBUG] handleRefreshAll: Testing repository ${repo.id} (${repo.name}) with URL: ${repo.url}`,
          );

          // Test the repository
          const result = await testGitRepository(testData);

          console.log(`🔎 [DEBUG] handleRefreshAll: Repository ${repo.name} test result:`, result);

          // Check if updateRepository function exists
          console.log(
            `🔎 [DEBUG] handleRefreshAll: updateRepository is type:`,
            typeof updateRepository,
          );

          // Update repository syncStatus based on test result
          if (repo.id) {
            let newSyncStatus: 'SYNCED' | 'ERROR' | 'IDLE' = 'IDLE';

            if (result.success) {
              newSyncStatus = 'SYNCED';
            } else if (
              result.error ||
              result.status === 404 ||
              result.status === 401 ||
              result.status === 403
            ) {
              newSyncStatus = 'ERROR';
            }

            console.log(
              `🔎 [DEBUG] handleRefreshAll: About to update repository ${repo.id} status to ${newSyncStatus}`,
            );

            // Get the current user for the update call
            try {
              // Update the repository in the database - need to use current user
              console.log(`🔎 [DEBUG] handleRefreshAll: Calling updateRepository...`);
              const updateResult = await updateRepository(repo.id, {
                sync_status: newSyncStatus,
                last_synced_at: new Date().toISOString(),
              });
              console.log(
                `🔎 [DEBUG] handleRefreshAll: Update result for ${repo.id}:`,
                updateResult,
              );

              // Clear only the cache for this specific repository
              if (repo.id) {
                await clearRepositoriesCache({ repositoryId: repo.id });
              }
            } catch (updateError) {
              console.error(
                `🔴 [DEBUG] handleRefreshAll: Error updating repository ${repo.id} status:`,
                updateError,
              );
            }
          } else {
            console.warn(
              `🔶 [DEBUG] handleRefreshAll: Cannot update repository - ID is missing:`,
              repo,
            );
          }

          // Small delay between tests to avoid overwhelming the server
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`🔴 [DEBUG] handleRefreshAll: Error testing repository ${repo.id}:`, error);
        } finally {
          // Mark this repo as no longer syncing
          setSyncingRepoIds((prev) => ({ ...prev, [repo.id]: false }));
        }
      }

      console.log(
        '🔎 [DEBUG] handleRefreshAll: Repository tests complete, refreshing repository list',
      );

      // Only clear the 'all' repositories cache at the end, not individual repository caches
      console.log("🔎 [DEBUG] handleRefreshAll: Final cache clearing for 'all' repositories...");
      await clearRepositoriesCache();

      // Refresh the entire list after all tests are complete
      console.log('🔎 [DEBUG] handleRefreshAll: Calling fetchRepositories to get updated data...');
      await fetchRepositories?.();
      console.log('🔎 [DEBUG] handleRefreshAll: fetchRepositories complete');
    } catch (error: unknown) {
      console.error('🔴 [DEBUG] handleRefreshAll: Unexpected error:', error);
    } finally {
      setIsRefreshingAll(false);
      // Clear all syncing states
      setSyncingRepoIds({});
      console.log('🔎 [DEBUG] handleRefreshAll: Function complete');
    }
  };

  // Re-implement handleSyncRepository for individual repository sync
  const handleSyncRepository = async (id: string): Promise<void> => {
    if (!id) return;

    try {
      setSyncingRepoIds((prev) => ({ ...prev, [id]: true }));

      // Import the test repository action and repository update action
      const { testGitRepository, updateRepository, clearRepositoriesCache } = await import(
        '@/app/[locale]/[tenant]/repositories/actions'
      );

      // Find the repository
      const repo = repositories?.find((r) => r.id === id);
      if (!repo) {
        console.error('Repository not found');
        return;
      }

      // Skip repositories without a URL
      if (!repo.url) {
        console.log(`Repository ${repo.id} has no URL, skipping test`);
        return;
      }

      // Create test data with the repository URL
      const testData = {
        url: repo.url,
        token: repo.provider?.access_token || '',
      };

      // Test the repository
      const result = await testGitRepository(testData);

      console.log(`Repository ${repo.name} test result:`, result);

      // Update repository syncStatus based on test result
      if (repo.id) {
        let newSyncStatus: 'SYNCED' | 'ERROR' | 'IDLE' = 'IDLE';

        if (result.success) {
          newSyncStatus = 'SYNCED';
        } else if (
          result.error ||
          result.status === 404 ||
          result.status === 401 ||
          result.status === 403
        ) {
          newSyncStatus = 'ERROR';
        }

        try {
          // Update the repository in the database - need to use current user
          await updateRepository(repo.id, {
            sync_status: newSyncStatus,
            last_synced_at: new Date().toISOString(),
          });

          // Clear this repository's cache after update
          await clearRepositoriesCache({ repositoryId: id });
        } catch (updateError) {
          console.error(`Error updating repository ${repo.id} status:`, updateError);
        }
      }

      // Only clear all repositories cache at the end if needed
      await fetchRepositories?.();
    } catch (error: unknown) {
      console.error('Error testing repository connection:', error);
    } finally {
      setSyncingRepoIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Handle toggling star status on a repository
  const handleToggleStarred = async (id: string): Promise<void> => {
    try {
      // Find the repository by ID
      const repository = repositories?.find((repo) => repo.id === id);
      if (!repository) {
        console.error('Repository not found for ID:', id);
        return;
      }

      // Call the repository method to toggle starred status
      if (typeof repository.toggleStarred === 'function') {
        await repository.toggleStarred();
      } else {
        console.error('toggleStarred method not found on repository');
      }
    } catch (error: unknown) {
      console.error('Error updating starred status:', error);
      toast({
        title: 'Error',
        description: t('starredUpdateFailed'),
        variant: 'destructive',
      });
    }
  };

  return {
    handleRefreshAll,
    handleSyncRepository,
    handleToggleStarred,
  };
}
