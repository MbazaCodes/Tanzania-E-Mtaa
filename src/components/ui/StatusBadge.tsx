import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  lang?: 'sw' | 'en';
  size?: 'sm' | 'md';
}

export function StatusBadge({ 
  status, 
  lang = 'sw',
  size = 'sm' 
}: StatusBadgeProps) {
  const baseStyles = "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider";

  const styles: Record<string, string> = {
    submitted: "bg-blue-50 text-blue-700 border-blue-200",
    pending_review: "bg-purple-50 text-purple-700 border-purple-200",
    pending_payment: "bg-orange-50 text-orange-700 border-orange-200",
    paid: "bg-amber-50 text-amber-700 border-amber-200",
    verified: "bg-indigo-50 text-indigo-700 border-indigo-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    issued: "bg-emerald-600 text-white border-emerald-600",
    rejected: "bg-red-50 text-red-700 border-red-200",
    returned: "bg-amber-50 text-amber-700 border-amber-200",
    processing: "bg-cyan-50 text-cyan-700 border-cyan-200",
  };

  const labels: Record<string, { sw: string; en: string }> = {
    submitted: { sw: "Imetumwa", en: "Submitted" },
    pending_review: { sw: "Inasubiri Uhakiki", en: "Pending Review" },
    pending_payment: { sw: "Inasubiri Malipo", en: "Pending Payment" },
    paid: { sw: "Imelipiwa", en: "Paid" },
    verified: { sw: "Imethibitishwa", en: "Verified" },
    approved: { sw: "Imeidhinishwa", en: "Approved" },
    issued: { sw: "Imetolewa", en: "Issued" },
    rejected: { sw: "Imekataliwa", en: "Rejected" },
    returned: { sw: "Imerudishwa", en: "Returned" },
    processing: { sw: "Inashughulikiwa", en: "Processing" },
  };

  const label = labels[status]?.[lang] || status;

  return (
    <span className={cn(baseStyles, styles[status] || "bg-stone-100 text-stone-600", 
      size === 'sm' ? 'text-[10px] py-0.5' : 'text-xs py-1'
    )}>
      {label}
    </span>
  );
}