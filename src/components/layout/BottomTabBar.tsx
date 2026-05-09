// src/components/layout/BottomTabBar.tsx
// Fixed bottom tab bar for mobile – makes the web app feel like a native app
import React, { useMemo } from 'react';
import { LayoutDashboard, Plus, FileText, User, Search, Eye, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { hasPermission, Permission } from '@/lib/rbac';
import { cn } from '@/lib/utils';

interface BottomTabBarProps {
  currentView: string;
  setView: (view: string) => void;
}

interface TabItem {
  id: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  label: string;
  view: string;
  permission: Permission | null;
}

export function BottomTabBar({ currentView, setView }: BottomTabBarProps) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const role = user?.role || 'citizen';

  const tabs = useMemo<TabItem[]>(() => {
    const dashView = role === 'admin' ? 'admin_dashboard' : role === 'staff' ? 'staff_dashboard' : 'dashboard';

    if (role === 'citizen') {
      return [
        {
          id: 'dashboard',
          icon: <LayoutDashboard size={22} />,
          label: lang === 'sw' ? 'Nyumbani' : 'Home',
          view: dashView,
          permission: null,
        },
        {
          id: 'services',
          icon: <Plus size={22} />,
          label: lang === 'sw' ? 'Omba' : 'Apply',
          view: 'services',
          permission: 'submit_applications' as const,
        },
        {
          id: 'applications',
          icon: <FileText size={22} />,
          label: lang === 'sw' ? 'Maombi' : 'My Apps',
          view: 'applications',
          permission: 'view_applications' as const,
        },
        {
          id: 'verify',
          icon: <Search size={22} />,
          label: lang === 'sw' ? 'Hakiki' : 'Verify',
          view: 'verify_documents',
          permission: null,
        },
        {
          id: 'profile',
          icon: <User size={22} />,
          label: lang === 'sw' ? 'Wasifu' : 'Profile',
          view: 'profile',
          permission: null,
        },
      ];
    }

    if (role === 'staff') {
      return [
        {
          id: 'dashboard',
          icon: <LayoutDashboard size={22} />,
          label: lang === 'sw' ? 'Nyumbani' : 'Home',
          view: dashView,
          permission: null,
        },
        {
          id: 'application_review',
          icon: <Eye size={22} />,
          label: lang === 'sw' ? 'Hakiki' : 'Review',
          view: 'application_review',
          permission: 'review_applications' as const,
        },
        {
          id: 'verify',
          icon: <Search size={22} />,
          label: lang === 'sw' ? 'Thibitisha' : 'Verify',
          view: 'verify_documents',
          permission: null,
        },
        {
          id: 'profile',
          icon: <User size={22} />,
          label: lang === 'sw' ? 'Wasifu' : 'Profile',
          view: 'profile',
          permission: null,
        },
      ];
    }

    // Admin
    return [
      {
        id: 'dashboard',
        icon: <LayoutDashboard size={22} />,
        label: lang === 'sw' ? 'Nyumbani' : 'Home',
        view: dashView,
        permission: null,
      },
      {
        id: 'staff_management',
        icon: <Shield size={22} />,
        label: lang === 'sw' ? 'Watumishi' : 'Staff',
        view: 'staff_management',
        permission: 'manage_staff' as const,
      },
      {
        id: 'citizen_management',
        icon: <FileText size={22} />,
        label: lang === 'sw' ? 'Wananchi' : 'Citizens',
        view: 'citizen_management',
        permission: 'view_all_applications' as const,
      },
      {
        id: 'profile',
        icon: <User size={22} />,
        label: lang === 'sw' ? 'Wasifu' : 'Profile',
        view: 'profile',
        permission: null,
      },
    ];
  }, [role, lang]);

  const visibleTabs = useMemo(
    () => tabs.filter(tab => !tab.permission || hasPermission(role, tab.permission)),
    [tabs, role]
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-stone-200 flex items-stretch pb-[env(safe-area-inset-bottom)]"
      aria-label={lang === 'sw' ? 'Urambazaji wa chini' : 'Bottom navigation'}
    >
      {visibleTabs.map((tab) => {
        const isActive = currentView === tab.view ||
          (tab.view === 'dashboard' && currentView === 'admin_dashboard') ||
          (tab.view === 'dashboard' && currentView === 'staff_dashboard');

        return (
          <button
            key={tab.id}
            onClick={() => setView(tab.view)}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 min-h-14 transition-all active:scale-95',
              isActive
                ? 'text-emerald-600'
                : 'text-stone-400 hover:text-stone-600'
            )}
          >
            <span className={cn(
              'relative transition-transform',
              isActive && 'scale-110'
            )}>
              {tab.icon}
              {isActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </span>
            <span className={cn(
              'text-[10px] font-semibold leading-none',
              isActive ? 'text-emerald-600' : 'text-stone-400'
            )}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
