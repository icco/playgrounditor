import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, onlineManager } from '@tanstack/react-query';
import { GitHubError } from './github';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const CACHE_MAX_AGE_MS = THIRTY_DAYS_MS;

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof GitHubError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: THIRTY_DAYS_MS,
      staleTime: 60 * 1000,
      networkMode: 'offlineFirst',
      retry: shouldRetry,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: '@playgrounditor:query_cache',
});

onlineManager.setEventListener(setOnline =>
  NetInfo.addEventListener(state => {
    setOnline(state.isConnected !== false);
  }),
);

export function useIsOnline(): boolean {
  return useSyncExternalStore(
    listener => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
  );
}
