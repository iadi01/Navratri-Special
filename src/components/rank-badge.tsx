import React from 'react';
import { Crown, Medal, Award, Trophy } from 'lucide-react';

interface RankBadgeProps {
  rank: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function RankBadge({ rank, size = 'md', showLabel = false, className = '' }: RankBadgeProps) {
  // 🥇 RANK 1: Distinctive Gold Grand Champion
  if (rank === 1) {
    const sizeClasses =
      size === 'sm'
        ? 'px-2 py-0.5 text-[10px] gap-1'
        : size === 'lg'
        ? 'px-3.5 py-1.5 text-xs sm:text-sm gap-1.5'
        : 'px-2.5 sm:px-3 py-1 text-xs gap-1';

    return (
      <span
        className={`inline-flex items-center justify-center font-black tracking-wider uppercase rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 text-amber-950 border-2 border-amber-600 shadow-[2px_2px_0px_#b45309] shrink-0 animate-in fade-in duration-200 select-none ${sizeClasses} ${className}`}
        title="🥇 1st Place — Grand Champion"
      >
        <Crown size={size === 'sm' ? 11 : size === 'lg' ? 16 : 13} className="text-amber-800 fill-amber-700 shrink-0" />
        <span>#{rank}</span>
        {showLabel && <span className="font-extrabold text-[10px] tracking-tight ml-0.5">WINNER</span>}
      </span>
    );
  }

  // 🥈 RANK 2: Distinctive Silver Runner-Up
  if (rank === 2) {
    const sizeClasses =
      size === 'sm'
        ? 'px-2 py-0.5 text-[10px] gap-1'
        : size === 'lg'
        ? 'px-3.5 py-1.5 text-xs sm:text-sm gap-1.5'
        : 'px-2.5 sm:px-3 py-1 text-xs gap-1';

    return (
      <span
        className={`inline-flex items-center justify-center font-black tracking-wider uppercase rounded-full bg-gradient-to-r from-slate-200 via-white to-slate-300 dark:from-slate-700 dark:via-slate-600 dark:to-slate-800 text-slate-800 dark:text-slate-100 border-2 border-slate-400 dark:border-slate-500 shadow-[2px_2px_0px_#64748b] shrink-0 animate-in fade-in duration-200 select-none ${sizeClasses} ${className}`}
        title="🥈 2nd Place — Runner Up"
      >
        <Medal size={size === 'sm' ? 11 : size === 'lg' ? 16 : 13} className="text-slate-600 dark:text-slate-300 shrink-0" />
        <span>#{rank}</span>
        {showLabel && <span className="font-extrabold text-[10px] tracking-tight ml-0.5">RUNNER UP</span>}
      </span>
    );
  }

  // 🥉 RANK 3: Distinctive Bronze 2nd Runner-Up
  if (rank === 3) {
    const sizeClasses =
      size === 'sm'
        ? 'px-2 py-0.5 text-[10px] gap-1'
        : size === 'lg'
        ? 'px-3.5 py-1.5 text-xs sm:text-sm gap-1.5'
        : 'px-2.5 sm:px-3 py-1 text-xs gap-1';

    return (
      <span
        className={`inline-flex items-center justify-center font-black tracking-wider uppercase rounded-full bg-gradient-to-r from-amber-700/25 via-orange-600/30 to-amber-800/25 text-amber-950 dark:text-amber-200 border-2 border-amber-700/60 shadow-[2px_2px_0px_#92400e] shrink-0 animate-in fade-in duration-200 select-none ${sizeClasses} ${className}`}
        title="🥉 3rd Place — 2nd Runner Up"
      >
        <Award size={size === 'sm' ? 11 : size === 'lg' ? 16 : 13} className="text-amber-800 dark:text-amber-300 shrink-0" />
        <span>#{rank}</span>
        {showLabel && <span className="font-extrabold text-[10px] tracking-tight ml-0.5">3RD PLACE</span>}
      </span>
    );
  }

  // 🎖️ RANK 4+: Uniform, clean badge with distinct number
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px]'
      : size === 'lg'
      ? 'px-3 py-1 text-xs'
      : 'px-2 sm:px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-extrabold rounded-lg bg-muted/80 text-foreground border border-border/80 shadow-2xs shrink-0 select-none ${sizeClasses} ${className}`}
      title={`Rank #${rank}`}
    >
      #{rank}
    </span>
  );
}
