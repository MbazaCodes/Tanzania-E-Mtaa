import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: number;
  description?: string;
  className?: string;
  color?: 'emerald' | 'blue' | 'amber' | 'purple';
}

export function StatCard({ 
  icon, 
  label, 
  value, 
  trend, 
  description, 
  className,
  color = 'emerald'
}: StatCardProps) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className={cn(
        "bg-white rounded-3xl p-6 border border-stone-100 shadow-sm hover:shadow-xl transition-all",
        className
      )}
    >
      <div className="flex items-start justify-between mb-5">
        <div className={cn("p-3 rounded-2xl", colorMap[color])}>
          {icon}
        </div>
        
        {trend !== undefined && (
          <div className={cn(
            "text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1",
            trend >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          )}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </div>

      <p className="text-sm font-semibold text-stone-500 tracking-wide mb-1">
        {label}
      </p>
      
      <p className="text-4xl font-black text-stone-900 tracking-tighter">
        {value}
      </p>

      {description && (
        <p className="text-xs text-stone-500 mt-3 leading-relaxed">
          {description}
        </p>
      )}
    </motion.div>
  );
}