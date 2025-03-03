import { prisma } from '@/lib/prisma';
import {
  Repository,
  RepositoryCreateInput,
  RepositoryUpdateInput,
  GitProvider,
  GitProviderType,
  SyncStatus,
} from '@/types/repositories';

import { GitHubProviderService } from './git-providers/github';

// Factory to get the appropriate provider service
export async function getGitProviderService(
  providerType: GitProviderType,
  options?: { serverUrl?: string; accessToken?: string },
) {
  switch (providerType) {
    case 'github':
      return new GitHubProviderService();
    case 'gitlab':
      // TODO: Implement GitLab provider
      throw new Error('GitLab provider not implemented yet');
    case 'gitea':
      if (options?.serverUrl) {
        const { GiteaProviderService } = await import('./git-providers/gitea');
        return new GiteaProviderService(options.serverUrl, options.accessToken);
      }
      throw new Error('Server URL is required for Gitea provider');
    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }
}

export async function listGitProviders(userId: string): Promise<GitProvider[]> {
  try {
    const providers = await prisma.gitProvider.findMany({
      where: { userId },
    });

    return providers.map((provider: any) => ({
      ...provider,
      status: provider.accessToken ? 'connected' : 'disconnected',
    }));
  } catch (error) {
    console.error('Error in listGitProviders:', error);
    // Return empty array when database table doesn't exist or other errors
    return [];
  }
}

export async function getGitProvider(id: string): Promise<GitProvider | null> {
  const provider = await prisma.gitProvider.findUnique({
    where: { id },
  });

  if (!provider) return null;

  return {
    ...provider,
    status: provider.accessToken ? 'connected' : 'disconnected',
  };
}

export async function createGitProvider(
  userId: string,
  data: {
    name: GitProviderType;
    displayName: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    serverUrl?: string;
  },
): Promise<GitProvider> {
  const { name, displayName, accessToken, refreshToken, expiresAt, serverUrl } = data;

  const provider = await prisma.gitProvider.create({
    data: {
      name,
      displayName,
      accessToken,
      refreshToken,
      expiresAt,
      serverUrl,
      userId,
    },
  });

  return {
    ...provider,
    status: provider.accessToken ? 'connected' : 'disconnected',
  };
}

export async function updateGitProvider(
  id: string,
  data: { accessToken?: string; refreshToken?: string; expiresAt?: Date },
): Promise<GitProvider> {
  const provider = await prisma.gitProvider.update({
    where: { id },
    data,
  });

  return {
    ...provider,
    status: provider.accessToken ? 'connected' : 'disconnected',
  };
}

export async function deleteGitProvider(id: string): Promise<void> {
  await prisma.gitProvider.delete({
    where: { id },
  });
}

export async function listRepositories(
  userId: string,
  filters?: {
    providerId?: string;
    projectId?: string;
    syncStatus?: SyncStatus;
  },
): Promise<Repository[]> {
  try {
    const where: any = {
      provider: {
        userId,
      },
    };

    if (filters?.providerId) {
      where.providerId = filters.providerId;
    }

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters?.syncStatus) {
      where.syncStatus = filters.syncStatus;
    }

    return await prisma.repository.findMany({
      where,
      include: {
        provider: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error in listRepositories:', error);
    // Return empty array when database table doesn't exist or other errors
    return [];
  }
}

export async function getRepository(id: string): Promise<Repository | null> {
  return prisma.repository.findUnique({
    where: { id },
    include: {
      provider: true,
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function createRepository(data: RepositoryCreateInput): Promise<Repository> {
  return prisma.repository.create({
    data: {
      name: data.name,
      description: data.description,
      url: data.url,
      defaultBranch: data.defaultBranch || 'main',
      providerId: data.providerId,
      projectId: data.projectId,
      syncStatus: 'IDLE',
    },
    include: {
      provider: true,
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function updateRepository(
  id: string,
  data: RepositoryUpdateInput,
): Promise<Repository> {
  return prisma.repository.update({
    where: { id },
    data,
    include: {
      provider: true,
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function deleteRepository(id: string): Promise<void> {
  await prisma.repository.delete({
    where: { id },
  });
}

export async function syncRepository(id: string): Promise<Repository> {
  // First, mark the repository as syncing
  const repository = await prisma.repository.update({
    where: { id },
    data: {
      syncStatus: 'SYNCING',
    },
    include: {
      provider: true,
    },
  });

  try {
    if (!repository.provider) {
      throw new Error('Repository provider not found');
    }

    const providerService = await getGitProviderService(
      repository.provider.name as GitProviderType,
    );

    // Sync the repository with the provider
    const syncedData = await providerService.syncRepository(repository);

    // Update the repository with the synced data
    return prisma.repository.update({
      where: { id },
      data: {
        name: syncedData.name,
        description: syncedData.description,
        url: syncedData.url,
        defaultBranch: syncedData.defaultBranch,
        lastSyncedAt: new Date(),
        syncStatus: 'SYNCED',
      },
      include: {
        provider: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  } catch (_error) {
    // If there's an error, mark the repository as having an error
    return prisma.repository.update({
      where: { id },
      data: {
        syncStatus: 'ERROR',
      },
      include: {
        provider: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
}

export async function importRepositoriesFromProvider(providerId: string): Promise<Repository[]> {
  const provider = await prisma.gitProvider.findUnique({
    where: { id: providerId },
  });

  if (!provider || !provider.accessToken) {
    throw new Error('Provider not found or not authenticated');
  }

  const providerService = await getGitProviderService(provider.name as GitProviderType);

  // Get repositories from the provider
  const repositories = await providerService.listRepositories(provider);

  // Get existing repositories to avoid duplicates
  const existingRepos = await prisma.repository.findMany({
    where: { providerId },
    select: { name: true },
  });

  const existingRepoNames = new Set(existingRepos.map((repo: any) => repo.name));

  // Filter out repositories that already exist
  const newRepositories = repositories.filter((repo) => !existingRepoNames.has(repo.name));

  // Create the new repositories
  const createdRepos = await Promise.all(
    newRepositories.map((repo) =>
      prisma.repository.create({
        data: {
          name: repo.name,
          description: repo.description,
          url: repo.url,
          defaultBranch: repo.defaultBranch,
          providerId,
          lastSyncedAt: new Date(),
          syncStatus: 'SYNCED',
        },
        include: {
          provider: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ),
  );

  return createdRepos;
}

interface TestConnectionParams {
  type: GitProviderType;
  serverUrl?: string;
  token: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export async function testGitProviderConnection({ type, serverUrl, token }: TestConnectionParams) {
  const response = await fetch('/api/repositories/test-connection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, serverUrl, token }),
  });

  const data: ApiResponse = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to test connection');
  }

  return data;
}
