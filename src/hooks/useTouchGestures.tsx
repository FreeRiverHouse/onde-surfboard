'use client'

import { useRef, useCallback, useState } from 'react';

interface TouchGestureOptions {
  onRefresh?: () => Promise<void>;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  pullThreshold?: number; // pixels to trigger refresh (default: 80)
  swipeThreshold?: number; // pixels to trigger swipe (default: 50)
  enabled?: boolean;
}

interface TouchGestureState {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
}

/**
 * Hook for mobile touch gestures: pull-to-refresh, swipe-to-close
 * Usage:
 *   const { handlers, state } = useTouchGestures({
 *     onRefresh: async () => { await fetchData(); },
 *     onSwipeDown: () => closeModal(),
 *   });
 *   <div {...handlers}> ... </div>
 */
export function useTouchGestures(options: TouchGestureOptions = {}) {
  const {
    onRefresh,
    onSwipeDown,
    onSwipeLeft,
    onSwipeRight,
    pullThreshold = 80,
    swipeThreshold = 50,
    enabled = true,
  } = options;

  const [state, setState] = useState<TouchGestureState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
  });

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const scrollStart = useRef<number>(0);
  const elementRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    
    // Store scroll position at touch start
    const target = e.currentTarget as HTMLElement;
    scrollStart.current = target?.scrollTop || window.scrollY;
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (!enabled || !touchStart.current) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStart.current.y;

    // Check if we're at the top and pulling down (for pull-to-refresh)
    const isAtTop = scrollStart.current <= 0;
    
    if (isAtTop && deltaY > 0 && onRefresh && !state.isRefreshing) {
      // Pulling down from top - enable pull-to-refresh
      const pullDistance = Math.min(deltaY * 0.5, pullThreshold * 1.5);
      setState(prev => ({
        ...prev,
        isPulling: true,
        pullDistance,
      }));
      
      // Prevent default scroll when pulling
      if (deltaY > 10) {
        e.preventDefault();
      }
    }
  }, [enabled, onRefresh, pullThreshold, state.isRefreshing]);

  const handleTouchEnd = useCallback(async (e: React.TouchEvent | TouchEvent) => {
    if (!enabled || !touchStart.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Check for pull-to-refresh
    if (state.isPulling && state.pullDistance >= pullThreshold && onRefresh) {
      setState(prev => ({ ...prev, isRefreshing: true, pullDistance: pullThreshold }));
      
      try {
        await onRefresh();
      } finally {
        setState({ isPulling: false, pullDistance: 0, isRefreshing: false });
      }
    } else if (state.isPulling) {
      // Reset if not enough pull
      setState({ isPulling: false, pullDistance: 0, isRefreshing: false });
    }

    // Check for swipe gestures (horizontal should be more dominant than vertical)
    const isHorizontalSwipe = absDeltaX > absDeltaY * 1.5;
    const isVerticalSwipe = absDeltaY > absDeltaX * 1.5;

    if (isVerticalSwipe && deltaY > swipeThreshold && onSwipeDown) {
      onSwipeDown();
    }

    if (isHorizontalSwipe) {
      if (deltaX < -swipeThreshold && onSwipeLeft) {
        onSwipeLeft();
      } else if (deltaX > swipeThreshold && onSwipeRight) {
        onSwipeRight();
      }
    }

    touchStart.current = null;
  }, [enabled, state.isPulling, state.pullDistance, pullThreshold, swipeThreshold, onRefresh, onSwipeDown, onSwipeLeft, onSwipeRight]);

  // Handler props to spread onto the element
  const handlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  return {
    handlers,
    state,
    // Ref setter for attaching to elements
    ref: (el: HTMLElement | null) => {
      elementRef.current = el;
    },
  };
}

/**
 * Pull indicator component for visual feedback during pull-to-refresh
 */
export function PullToRefreshIndicator({ 
  pullDistance, 
  threshold, 
  isRefreshing 
}: { 
  pullDistance: number; 
  threshold: number; 
  isRefreshing: boolean;
}) {
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = isRefreshing ? 'animate-spin' : '';
  const opacity = Math.min(progress * 1.5, 1);
  
  if (pullDistance <= 0 && !isRefreshing) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 flex justify-center items-center z-50 pointer-events-none transition-transform"
      style={{ 
        transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
        opacity,
      }}
    >
      <div className={`bg-slate-800 border border-slate-600 rounded-full p-3 shadow-lg ${rotation}`}>
        <svg 
          className="w-6 h-6 text-cyan-400" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          style={{ 
            transform: !isRefreshing ? `rotate(${progress * 180}deg)` : undefined,
            transition: 'transform 0.1s ease-out'
          }}
        >
          <path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {isRefreshing && (
        <span className="ml-2 text-sm text-cyan-400 font-medium">Refreshing...</span>
      )}
      {!isRefreshing && progress >= 1 && (
        <span className="ml-2 text-sm text-cyan-400 font-medium">Release to refresh</span>
      )}
    </div>
  );
}
