import React from 'react';
import { cn } from '@/lib/utils';
import { ProgressFill } from './ProgressFill';
import { 
  ClipboardCheck, CreditCard, Search, CheckCircle2, FileCheck2, 
  XCircle, RotateCcw 
} from 'lucide-react';

interface ApplicationProgressBarProps {
  status: string;
  lang?: 'sw' | 'en';
  compact?: boolean;
}

export function ApplicationProgressBar({ 
  status, 
  lang = 'sw', 
  compact = false 
}: ApplicationProgressBarProps) {
  const stages = [
    { id: 'submitted', labelSw: 'Imetumwa', labelEn: 'Submitted', icon: ClipboardCheck },
    { id: 'pending_payment', labelSw: 'Malipo', labelEn: 'Payment', icon: CreditCard },
    { id: 'paid', labelSw: 'Imelipiwa', labelEn: 'Paid', icon: CreditCard },
    { id: 'verified', labelSw: 'Thibitisha', labelEn: 'Verify', icon: Search },
    { id: 'approved', labelSw: 'Idhinishwa', labelEn: 'Approved', icon: CheckCircle2 },
    { id: 'issued', labelSw: 'Imetolewa', labelEn: 'Issued', icon: FileCheck2 },
  ];

  const statusOrder: Record<string, number> = {
    submitted: 0,
    pending_review: 0,
    pending_payment: 1,
    paid: 2,
    verified: 3,
    approved: 4,
    issued: 5,
    rejected: -1,
    returned: -2,
  };

  const currentIndex = statusOrder[status] ?? 0;
  const isRejected = status === 'rejected';
  const isReturned = status === 'returned';

  if (isRejected) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <XCircle className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <p className="font-bold text-red-700 text-sm">
            {lang === 'sw' ? 'Maombi Yamekataliwa' : 'Application Rejected'}
          </p>
          <p className="text-xs text-red-600">
            {lang === 'sw' ? 'Maombi haya yamekatwa' : 'This application has been rejected'}
          </p>
        </div>
      </div>
    );
  }

  if (isReturned) {
    return (
      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <RotateCcw className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p className="font-bold text-amber-700 text-sm">
            {lang === 'sw' ? 'Imerudishwa kwa Marekebisho' : 'Returned for Revision'}
          </p>
          <p className="text-xs text-amber-600">
            {lang === 'sw' ? 'Tafadhali fanya marekebisho' : 'Please make the required changes'}
          </p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {stages.slice(0, 5).map((stage, idx) => {
          const isDone = currentIndex >= idx;
          return (
            <React.Fragment key={stage.id}>
              <div className={cn(
                "h-2.5 w-2.5 rounded-full",
                isDone ? "bg-emerald-500" : "bg-stone-200"
              )} />
              {idx < 4 && <div className={cn("h-px w-6", isDone ? "bg-emerald-500" : "bg-stone-200")} />}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  // Full progress bar
  return (
    <div className="relative pt-2">
      <div className="absolute top-6 left-6 right-6 h-1 bg-stone-100 rounded-full">
        <ProgressFill
          progress={Math.max(0, Math.min(100, (currentIndex / 5) * 100))}
          transitionDuration={700}
          className="h-1 bg-emerald-500 rounded-full will-change-[width]"
        />
      </div>

      <div className="flex justify-between relative">
        {stages.map((stage, index) => {
          const isCompleted = currentIndex >= index;
          const isCurrent = currentIndex === index;
          const Icon = stage.icon;

          return (
            <div key={stage.id} className="flex flex-col items-center text-center w-16">
              <div className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center mb-3 transition-all",
                isCompleted ? "bg-emerald-500 text-white" : "bg-stone-100 text-stone-400",
                isCurrent && "ring-4 ring-emerald-100 scale-110"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <p className={cn(
                "text-[10px] font-semibold leading-tight",
                isCompleted ? "text-emerald-700" : "text-stone-400"
              )}>
                {lang === 'sw' ? stage.labelSw : stage.labelEn}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}