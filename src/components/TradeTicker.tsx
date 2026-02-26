'use client';

import { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Clock, Zap } from 'lucide-react';

/**
 * TradeTicker Component (T333)
 * 
 * Displays recent trades in a scrolling ticker format.
 * Shows ticker, side (YES/NO), price, and result status.
 */

interface Trade {
  timestamp: string;
  ticker: string;
  side: string;
  contracts: number;
  price_cents: number;
  result_status?: string;
  asset?: string;
}

interface TradeTickerProps {
  trades: Trade[];
  speed?: 'slow' | 'normal' | 'fast';
  showTimestamp?: boolean;
  className?: string;
}

export function TradeTicker({ 
  trades, 
  speed = 'normal',
  showTimestamp = false,
  className = '' 
}: TradeTickerProps) {
  const tickerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Speed presets (px per frame at 60fps)
  const speedMap = {
    slow: 0.3,
    normal: 0.5,
    fast: 0.8
  };
  
  // Animation using requestAnimationFrame for smooth scrolling
  useEffect(() => {
    if (!tickerRef.current || trades.length === 0) return;
    
    const ticker = tickerRef.current;
    let animationId: number;
    let position = 0;
    
    const animate = () => {
      if (!isPaused) {
        position -= speedMap[speed];
        
        // Reset when first item is fully scrolled out
        const firstChild = ticker.children[0] as HTMLElement;
        if (firstChild && position <= -firstChild.offsetWidth) {
          position = 0;
          // Move first item to end
          ticker.appendChild(firstChild.cloneNode(true));
          ticker.removeChild(firstChild);
        }
        
        ticker.style.transform = `translateX(${position}px)`;
      }
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationId);
  }, [trades, speed, isPaused]);
  
  if (trades.length === 0) {
    return (
      <div className={`bg-black/30 border border-white/5 rounded-lg p-2 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <Clock className="w-3 h-3" />
          <span>No recent trades</span>
        </div>
      </div>
    );
  }
  
  // Duplicate trades for seamless loop
  const displayTrades = [...trades, ...trades];
  
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch {
      return '';
    }
  };
  
  const getAssetFromTicker = (ticker: string): string => {
    if (ticker.includes('KXETHD')) return 'ETH';
    if (ticker.includes('KXBTCD')) return 'BTC';
    if (ticker.includes('KXSOLD')) return 'SOL';  // T423: Solana support
    return '';
  };
  
  const getStrikeFromTicker = (ticker: string): string => {
    const match = ticker.match(/-T(\d+\.?\d*)/);
    if (match) {
      const strike = parseFloat(match[1]);
      return strike >= 1000 ? `$${Math.round(strike).toLocaleString()}` : `$${strike}`;
    }
    return '';
  };
  
  return (
    <div 
      className={`bg-black/30 border border-white/5 rounded-lg overflow-hidden ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] border-b border-white/5">
        <Zap className="w-3 h-3 text-yellow-400" />
        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
          Recent Trades
        </span>
        <span className="text-[10px] text-gray-600">
          • {trades.length} trades
        </span>
        {isPaused && (
          <span className="text-[10px] text-cyan-400 ml-auto">
            ⏸ paused
          </span>
        )}
      </div>
      
      <div className="relative h-8 overflow-hidden">
        <div 
          ref={tickerRef}
          className="absolute flex items-center h-full whitespace-nowrap"
        >
          {displayTrades.map((trade, i) => {
            const asset = trade.asset || getAssetFromTicker(trade.ticker);
            const strike = getStrikeFromTicker(trade.ticker);
            const isWon = trade.result_status === 'won';
            const isLost = trade.result_status === 'lost';
            const isPending = !trade.result_status || trade.result_status === 'pending';
            
            return (
              <div
                key={`${trade.timestamp}-${i}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1 mx-1 rounded-full text-xs transition-colors ${
                  isWon 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : isLost
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}
              >
                {/* Asset badge */}
                {asset && (
                  <span className={`text-[10px] font-bold px-1 rounded ${
                    asset === 'BTC' ? 'bg-orange-500/30 text-orange-300' 
                    : asset === 'SOL' ? 'bg-cyan-500/30 text-cyan-300'  // T423: Solana styling
                    : 'bg-purple-500/30 text-purple-300'
                  }`}>
                    {asset}
                  </span>
                )}
                
                {/* Side indicator */}
                <span className={`font-medium ${
                  trade.side.toLowerCase() === 'yes' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {trade.side.toUpperCase()}
                </span>
                
                {/* Strike price */}
                {strike && (
                  <span className="text-gray-400 text-[10px]">
                    {strike}
                  </span>
                )}
                
                {/* Price & contracts */}
                <span className="text-gray-300">
                  {trade.contracts}×{trade.price_cents}¢
                </span>
                
                {/* Result indicator */}
                {isWon && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                {isLost && <TrendingDown className="w-3 h-3 text-red-400" />}
                {isPending && <Clock className="w-3 h-3 text-gray-500 animate-pulse" />}
                
                {/* Timestamp (optional) */}
                {showTimestamp && (
                  <span className="text-gray-600 text-[10px]">
                    {formatTime(trade.timestamp)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Static version - no scrolling, just shows trades in a row
 */
export function TradeTickerStatic({ 
  trades, 
  maxItems = 8,
  className = '' 
}: { 
  trades: Trade[]; 
  maxItems?: number;
  className?: string;
}) {
  if (trades.length === 0) {
    return (
      <div className={`flex items-center gap-2 text-gray-500 text-xs ${className}`}>
        <Clock className="w-3 h-3" />
        <span>Waiting for trades...</span>
      </div>
    );
  }
  
  const displayTrades = trades.slice(0, maxItems);
  
  const getAssetFromTicker = (ticker: string): string => {
    if (ticker.includes('KXETHD')) return 'ETH';
    if (ticker.includes('KXBTCD')) return 'BTC';
    if (ticker.includes('KXSOLD')) return 'SOL';  // T423: Solana support
    return '';
  };
  
  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {displayTrades.map((trade, i) => {
        const asset = trade.asset || getAssetFromTicker(trade.ticker);
        const isWon = trade.result_status === 'won';
        const isLost = trade.result_status === 'lost';
        
        return (
          <div
            key={`${trade.timestamp}-${i}`}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
              isWon 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : isLost
                ? 'bg-red-500/20 text-red-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}
            title={`${trade.side.toUpperCase()} ${trade.contracts}x @ ${trade.price_cents}¢`}
          >
            {asset && (
              <span className={`font-bold ${
                asset === 'BTC' ? 'text-orange-300' 
                : asset === 'SOL' ? 'text-cyan-300'  // T423: Solana styling
                : 'text-purple-300'
              }`}>
                {asset}
              </span>
            )}
            <span>{trade.side.toUpperCase()}</span>
            <span>{trade.price_cents}¢</span>
            {isWon && '✓'}
            {isLost && '✗'}
          </div>
        );
      })}
      {trades.length > maxItems && (
        <span className="text-gray-600 text-[10px]">
          +{trades.length - maxItems} more
        </span>
      )}
    </div>
  );
}
