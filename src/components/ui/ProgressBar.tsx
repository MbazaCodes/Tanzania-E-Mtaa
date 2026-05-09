// src/components/ui/ProgressBar.tsx
import React from 'react';
import { ProgressFill } from './ProgressFill';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  /** Progress value (0-100) */
  progress: number;
  
  /** Optional label shown above the bar */
  label?: string;
  
  /** Show percentage text inside or beside the bar */
  showPercentage?: boolean;
  
  /** Custom height of the bar */
  height?: 'sm' | 'md' | 'lg';
  
  /** Background color of the track */
  trackColor?: string;
  
  /** Fill color of the progress */
  fillColor?: string;
  
  /** Transition duration in ms */
  transitionDuration?: number;
  
  /** Additional classes for the container */
  className?: string;
  
  /** Additional classes for the fill */
  fillClassName?: string;
}

export function ProgressBar({
  progress,
  label,
  showPercentage = false,
  height = 'md',
  trackColor = 'bg-stone-200',
  fillColor = 'bg-emerald-500',
  transitionDuration = 400,
  className = '',
  fillClassName = '',
}: ProgressBarProps) {
  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Label + Percentage */}
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2 text-sm">
          {label && <span className="font-medium text-stone-600">{label}</span>}
          {showPercentage && (
            <span className="font-mono font-semibold text-stone-500">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}

      {/* Progress Track */}
      <div
        className={cn(
          "w-full rounded-full overflow-hidden",
          heightClasses[height],
          trackColor
        )}
      >
        <ProgressFill
          progress={progress}
          transitionDuration={transitionDuration}
          className={cn(
            "h-full rounded-full transition-all",
            fillColor,
            fillClassName
          )}
        />
      </div>
    </div>
  );
}