'use client';

import { useCallback, useEffect, useState } from 'react';

export type SyncTag = 'sync-trading-stats' | 'sync-momentum' | 'sync-all';

interface SyncResult {
  success: string[];
  failed: Array<{ endpoint: string; status?: number; error?: string }>;
}

interface SyncState {
  isSupported: boolean;
  isPending: boolean;
  lastSync: Date | null;
  lastResult: SyncResult | null;
}

/**
 * Hook for interacting with the service worker's Background Sync functionality.
 * Provides methods to queue syncs and listen for sync completion.
 */
export function useBackgroundSync() {
  const [state, setState] = useState<SyncState>({
    isSupported: false,
    isPending: false,
    lastSync: null,
    lastResult: null,
  });

  // Check if Background Sync is supported
  useEffect(() => {
    const checkSupport = async () => {
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          setState(prev => ({ ...prev, isSupported: 'sync' in registration }));
        } catch {
          setState(prev => ({ ...prev, isSupported: false }));
        }
      }
    };
    checkSupport();
  }, []);

  // Listen for sync completion messages from service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_COMPLETE') {
        setState(prev => ({
          ...prev,
          isPending: false,
          lastSync: new Date(event.data.timestamp),
          lastResult: event.data.results,
        }));
      }
      if (event.data && event.data.type === 'SYNC_QUEUED') {
        setState(prev => ({ ...prev, isPending: true }));
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  /**
   * Request a background sync for the specified tag.
   * Will be processed when the device comes online (if currently offline).
   */
  const requestSync = useCallback(async (tag: SyncTag = 'sync-all'): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('sync' in registration) {
        // Use native Background Sync API
        await (registration as any).sync.register(tag);
        setState(prev => ({ ...prev, isPending: true }));
        console.log('[BackgroundSync] Registered:', tag);
        return true;
      } else {
        // Fallback: send message to service worker
        const controller = registration.active;
        if (controller) {
          const channel = new MessageChannel();
          channel.port1.onmessage = (event) => {
            if (event.data.type === 'SYNC_QUEUED') {
              setState(prev => ({ ...prev, isPending: true }));
            }
          };
          controller.postMessage({ type: 'REQUEST_SYNC', tag }, [channel.port2]);
          console.log('[BackgroundSync] Requested via message:', tag);
          return true;
        }
      }
    } catch (error) {
      console.error('[BackgroundSync] Failed to register sync:', error);
    }
    return false;
  }, []);

  /**
   * Force an immediate sync (for online scenarios or testing).
   * Returns the sync results.
   */
  const forceSync = useCallback(async (tag: SyncTag = 'sync-all'): Promise<SyncResult | null> => {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const controller = registration.active;
      
      if (controller) {
        setState(prev => ({ ...prev, isPending: true }));
        
        return new Promise((resolve) => {
          const channel = new MessageChannel();
          channel.port1.onmessage = (event) => {
            if (event.data.type === 'SYNC_COMPLETE') {
              setState(prev => ({
                ...prev,
                isPending: false,
                lastSync: new Date(),
                lastResult: event.data.results,
              }));
              resolve(event.data.results);
            }
          };
          controller.postMessage({ type: 'FORCE_SYNC', tag }, [channel.port2]);
          console.log('[BackgroundSync] Force sync requested:', tag);
        });
      }
    } catch (error) {
      console.error('[BackgroundSync] Force sync failed:', error);
      setState(prev => ({ ...prev, isPending: false }));
    }
    return null;
  }, []);

  /**
   * Check if online and trigger immediate refresh, otherwise queue for later.
   */
  const smartSync = useCallback(async (tag: SyncTag = 'sync-all'): Promise<SyncResult | null> => {
    if (navigator.onLine) {
      return forceSync(tag);
    } else {
      await requestSync(tag);
      return null;
    }
  }, [forceSync, requestSync]);

  return {
    ...state,
    requestSync,
    forceSync,
    smartSync,
  };
}

export default useBackgroundSync;
