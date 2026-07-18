import { QueryClient } from '@tanstack/react-query';

/**
 * Shared React Query client. Retries transient failures a couple of times but
 * never retries validation/auth errors (those are surfaced to the user).
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
