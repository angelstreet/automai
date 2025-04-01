import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';

// Generic data fetching hook
export function useFetchQuery<T>(
  queryKey: QueryKey,
  fetchFn: () => Promise<T>,
  options?: UseQueryOptions<T>
) {
  return useQuery({
    queryKey,
    queryFn: fetchFn,
    ...options,
  });
}

// Generic mutation hook with cache invalidation
export function useDataMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidateQueries: QueryKey[],
  options?: UseMutationOptions<TData, Error, TVariables>
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn,
    ...options,
    onSuccess: (data, variables, context) => {
      // Invalidate related queries
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
      
      // Call original onSuccess if provided
      if (options?.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
  });
}