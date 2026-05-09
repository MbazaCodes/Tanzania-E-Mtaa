import React from 'react';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/rbac';
import { UserRole } from '@/lib/supabase';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  requiredPermission?: import('@/lib/rbac').Permission;
  userRole?: UserRole;
  disabled?: boolean;
}

export function SidebarItem({ 
  icon, 
  label, 
  active = false, 
  onClick, 
  requiredPermission,
  userRole,
  disabled = false 
}: SidebarItemProps) {
  // Hide item if user doesn't have required permission
  if (requiredPermission && userRole && !hasPermission(userRole, requiredPermission)) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-semibold w-full text-left group",
        active 
          ? "bg-emerald-50 text-emerald-700 shadow-sm font-bold" 
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-800",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span className={cn(
        "transition-colors",
        active ? "text-emerald-600" : "text-stone-400 group-hover:text-stone-500"
      )}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}