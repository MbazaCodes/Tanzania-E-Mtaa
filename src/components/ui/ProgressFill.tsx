// src/components/ui/ProgressFill.tsx
import React, { useLayoutEffect, useRef, memo } from 'react';

interface ProgressFillProps {
  progress: number;
  className?: string;
  transitionDuration?: number;
}

export const ProgressFill = memo(function ProgressFill({
  progress,
  className = '',
  transitionDuration = 300,
}: ProgressFillProps) {
  const fillRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = fillRef.current;
    if (!element) return;

    const safeProgress = Math.max(0, Math.min(100, progress));

    element.style.transition = `width ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    element.style.width = `${safeProgress}%`;
  }, [progress, transitionDuration]);

  return (
    <div
      ref={fillRef}
      className={`will-change-[width] ${className}`.trim()}
    />
  );
});