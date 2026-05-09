// src/components/layout/Sidebar.tsx
import React, { useMemo } from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  FileText, 
  Search, 
  Eye, 
  Shield, 
  Users,
  User,
  Settings,
  Activity
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { SidebarItem } from '@/components/ui/SidebarItem';
import { Permission, hasPermission } from '@/lib/rbac';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
}

interface MenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  view: string;
  permission: Permission | null;
}

export function Sidebar({ currentView, setView }: SidebarProps) {
  const { user } = useAuth();
  const { lang } = useLanguage();

  const role = user?.role || 'citizen';

  // Define all menu items with RBAC permissions
  const menuConfig = useMemo<MenuItem[]>(() => [
    // Dashboard - Visible to everyone
    {
      id: 'dashboard',
      icon: <LayoutDashboard size={20} />,
      label: lang === 'sw' ? 'Dashibodi' : 'Dashboard',
      view: role === 'admin' ? 'admin_dashboard' : role === 'staff' ? 'staff_dashboard' : 'dashboard',
      permission: null
    },

    // Citizen-only items
    ...(role === 'citizen' ? [
      {
        id: 'services',
        icon: <Plus size={20} />,
        label: lang === 'sw' ? 'Omba Huduma' : 'Apply for Service',
        view: 'services',
        permission: 'submit_applications' as const
      },
      {
        id: 'applications',
        icon: <FileText size={20} />,
        label: lang === 'sw' ? 'Maombi Yangu' : 'My Applications',
        view: 'applications',
        permission: 'view_applications' as const
      }
    ] : []),

    // Admin-only items
    ...(role === 'admin' ? [
      {
        id: 'staff_management',
        icon: <Shield size={20} />,
        label: lang === 'sw' ? 'Usimamizi wa Watumishi' : 'Staff Management',
        view: 'staff_management',
        permission: 'manage_staff' as const
      },
      {
        id: 'citizen_management',
        icon: <Users size={20} />,
        label: lang === 'sw' ? 'Usimamizi wa Wananchi' : 'Citizen Management',
        view: 'citizen_management',
        permission: 'view_all_applications' as const
      },
      {
        id: 'service_management',
        icon: <Settings size={20} />,
        label: lang === 'sw' ? 'Usimamizi wa Huduma' : 'Service Management',
        view: 'service_management',
        permission: 'manage_services' as const
      },
      {
        id: 'admin_logs',
        icon: <Activity size={20} />,
        label: lang === 'sw' ? 'Kumbukumbu' : 'Activity Logs',
        view: 'admin_logs',
        permission: null
      }
    ] : []),

    // Staff-only items
    ...(role === 'staff' ? [
      {
        id: 'application_review',
        icon: <Eye size={20} />,
        label: lang === 'sw' ? 'Uhakiki wa Maombi' : 'Application Review',
        view: 'application_review',
        permission: 'review_applications' as const
      },
    ] : []),

    // Common items (available to all authenticated users)
    {
      id: 'verify_documents',
      icon: <Search size={20} />,
      label: lang === 'sw' ? 'Hakiki Hati' : 'Verify Document',
      view: 'verify_documents',
      permission: 'verify_documents' as const
    },
    {
      id: 'profile',
      icon: <User size={20} />,
      label: lang === 'sw' ? 'Wasifu' : 'Profile',
      view: 'profile',
      permission: null
    }
  ], [role, lang]);

  // Filter items based on user permissions
  const visibleItems = useMemo(() => {
    return menuConfig.filter(item => {
      if (!item.permission) return true;
      return hasPermission(role, item.permission);
    });
  }, [menuConfig, role]);

  return (
    <aside className="w-64 bg-white border-r border-stone-200 hidden lg:flex flex-col h-screen overflow-hidden">
      {/* Logo Header */}
      <div className="p-6 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <span className="text-white font-black text-2xl">E</span>
          </div>
          <div>
            <div className="font-black text-2xl tracking-tighter text-stone-900">E-MTAA</div>
            <div className="text-xs font-bold text-emerald-600 -mt-1">LOCAL GOVERNMENT PORTAL</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {visibleItems.map((item) => (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={currentView === item.view}
            onClick={() => setView(item.view)}
          />
        ))}
      </nav>

      {/* Footer - Role Info */}
      <div className="p-4 border-t border-stone-100 bg-stone-50">
        <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-2xl border">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold">
            {user?.first_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-stone-800 truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-stone-500 capitalize">
              {role === 'admin' ? (lang === 'sw' ? 'Msimamizi' : 'Administrator') :
               role === 'staff' ? (lang === 'sw' ? 'Mtumishi' : 'Staff') : 
               (lang === 'sw' ? 'Raia' : 'Citizen')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}