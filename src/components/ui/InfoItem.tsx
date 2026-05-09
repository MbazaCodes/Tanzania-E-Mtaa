import React from 'react';

interface InfoItemProps {
  label: string;
  value: string | number | null | undefined;
  className?: string;
}

export function InfoItem({ label, value, className }: InfoItemProps) {
  const displayValue = value ?? '—';

  return (
    <div className={className}>
      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-stone-800 font-medium wrap-break-word">
        {displayValue}
      </p>
    </div>
  );
}