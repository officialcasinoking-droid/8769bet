import { useMutation, useQueryClient, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query';

export interface OptimisticMutationOptions<TData, TVariables, TContext = unknown>
  extends Omit<UseMutationOptions<TData, Error, TVariables, TContext>, 'mutationFn'> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey?: any[];
  optimisticData?: (variables: TVariables) => any;
  rollbackOnError?: boolean;
  onSuccessMessage?: string;
  errorMessage?: string;
}

export function useOptimisticMutation<TData = unknown, TVariables = void, TContext = unknown>({
  mutationFn,
  queryKey,
  optimisticData,
  rollbackOnError = true,
  onSuccessMessage,
  errorMessage,
  ...options
}: OptimisticMutationOptions<TData, TVariables, TContext>): UseMutationResult<TData, Error, TVariables, TContext> {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables, TContext>({
    mutationFn,
    onMutate: async (variables) => {
      if (queryKey) {
        await queryClient.cancelQueries({ queryKey });
        const previousData = queryClient.getQueryData(queryKey);
        if (optimisticData) {
          queryClient.setQueryData(queryKey, optimisticData(variables));
        }
        return previousData as TContext;
      }
      return undefined as TContext;
    },
    onError: (err, variables, context) => {
      if (rollbackOnError && queryKey && context) {
        queryClient.setQueryData(queryKey, context);
      }
      console.error(errorMessage || 'Mutation failed:', err);
    },
    onSuccess: () => {
      if (queryKey) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
    ...options,
  });
}

export function useDeleteMutation<TData = unknown, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  queryKey: any[],
  options?: Partial<OptimisticMutationOptions<TData, TVariables>>
): UseMutationResult<TData, Error, TVariables> {
  return useOptimisticMutation({
    mutationFn,
    queryKey,
    ...options,
  });
}

export function useUpdateMutation<TData = unknown, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  queryKey: any[],
  options?: Partial<OptimisticMutationOptions<TData, TVariables>>
): UseMutationResult<TData, Error, TVariables> {
  return useOptimisticMutation({
    mutationFn,
    queryKey,
    ...options,
  });
}

export function useCreateMutation<TData = unknown, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  queryKey: any[],
  options?: Partial<OptimisticMutationOptions<TData, TVariables>>
): UseMutationResult<TData, Error, TVariables> {
  return useOptimisticMutation({
    mutationFn,
    queryKey,
    ...options,
  });
}