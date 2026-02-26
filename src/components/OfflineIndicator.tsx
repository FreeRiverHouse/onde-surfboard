'use client';

import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnected(true);
        // Auto-hide reconnected message after 3s
        setTimeout(() => setShowReconnected(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  // Offline banner
  if (!isOnline) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[100] bg-gradient-to-r from-orange-600 to-amber-600 text-white py-2 px-4 text-center shadow-lg animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <span className="font-medium text-sm">
            You&apos;re offline — showing cached data
          </span>
          <span className="text-white/70 text-xs ml-2 hidden sm:inline">
            Some features may be limited
          </span>
        </div>
      </div>
    );
  }

  // Reconnected toast
  if (showReconnected) {
    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[100] bg-gradient-to-r from-emerald-600 to-green-600 text-white py-2 px-4 rounded-full shadow-lg animate-in fade-in slide-in-from-bottom duration-300">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium text-sm">Back online!</span>
        </div>
      </div>
    );
  }

  return null;
}
