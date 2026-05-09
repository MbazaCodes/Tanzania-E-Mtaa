// src/components/layout/MobileNav.tsx
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  X,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { Permission, hasPermission } from '@/lib/rbac';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
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

export function MobileNav({ isOpen, onClose, currentView, setView }: MobileNavProps) {
  const { user, signOut } = useAuth();
  const { lang } = useLanguage();

  const role = user?.role || 'citizen';

  // Menu configuration with RBAC
  const menuConfig = useMemo<MenuItem[]>(() => [
    {
      id: 'dashboard',
      icon: <LayoutDashboard size={22} />,
      label: lang === 'sw' ? 'Dashibodi' : 'Dashboard',
      view: role === 'admin' ? 'admin_dashboard' : role === 'staff' ? 'staff_dashboard' : 'dashboard',
      permission: null
    },

    // Citizen items
    ...(role === 'citizen' ? [
      {
        id: 'services',
        icon: <Plus size={22} />,
        label: lang === 'sw' ? 'Omba Huduma' : 'Apply for Service',
        view: 'services',
        permission: 'submit_applications' as const
      },
      {
        id: 'applications',
        icon: <FileText size={22} />,
        label: lang === 'sw' ? 'Maombi Yangu' : 'My Applications',
        view: 'applications',
        permission: 'view_applications' as const
      }
    ] : []),

    // Admin items
    ...(role === 'admin' ? [
      {
        id: 'staff_management',
        icon: <Shield size={22} />,
        label: lang === 'sw' ? 'Usimamizi wa Watumishi' : 'Staff Management',
        view: 'staff_management',
        permission: 'manage_staff' as const
      },
      {
        id: 'citizen_management',
        icon: <Users size={22} />,
        label: lang === 'sw' ? 'Usimamizi wa Wananchi' : 'Citizen Management',
        view: 'citizen_management',
        permission: 'view_all_applications' as const
      },
      {
        id: 'service_management',
        icon: <Settings size={22} />,
        label: lang === 'sw' ? 'Usimamizi wa Huduma' : 'Service Management',
        view: 'service_management',
        permission: 'manage_services' as const
      }
    ] : []),

    // Staff items
    ...(role === 'staff' ? [
      {
        id: 'application_review',
        icon: <Eye size={22} />,
        label: lang === 'sw' ? 'Uhakiki wa Maombi' : 'Application Review',
        view: 'application_review',
        permission: 'review_applications' as const
      },
    ] : []),

    // Common items for all roles
    {
      id: 'verify_documents',
      icon: <Search size={22} />,
      label: lang === 'sw' ? 'Hakiki Hati' : 'Verify Document',
      view: 'verify_documents',
      permission: 'verify_documents' as const
    },
    {
      id: 'profile',
      icon: <User size={22} />,
      label: lang === 'sw' ? 'Wasifu' : 'Profile',
      view: 'profile',
      permission: null
    }
  ], [role, lang]);

  // Filter items by permission
  const visibleItems = useMemo(() => {
    return menuConfig.filter(item => 
      !item.permission || hasPermission(role, item.permission)
    );
  }, [menuConfig, role]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 lg:hidden">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b bg-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center">
                  <span className="text-white font-black text-2xl">E</span>
                </div>
                <div>
                  <div className="font-black text-2xl tracking-tighter">E-MTAA</div>
                  <div className="text-xs text-emerald-600 font-bold -mt-1">PORTAL</div>
                </div>
              </div>
              <button 
                onClick={onClose}
                title={lang === 'sw' ? 'Funga menyu' : 'Close menu'}
                aria-label={lang === 'sw' ? 'Funga menyu' : 'Close menu'}
                className="p-2 hover:bg-stone-100 rounded-xl text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X size={26} />
              </button>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setView(item.view);
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-medium text-left transition-all",
                    currentView === item.view 
                      ? "bg-emerald-50 text-emerald-700 shadow-sm" 
                      : "hover:bg-stone-50 text-stone-600"
                  )}
                >
                  <span className="text-emerald-500">{item.icon}</span>
                  <span className="text-[15px]">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Footer - User Info & Sign Out */}
            <div className="p-4 border-t bg-stone-50">
              {user && (
                <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border mb-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 font-semibold text-xl shrink-0">
                    {user.first_name?.[0] || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-900 truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-stone-500 capitalize">
                      {role === 'admin' ? (lang === 'sw' ? 'Msimamizi' : 'Administrator') :
                       role === 'staff' ? (lang === 'sw' ? 'Mtumishi' : 'Staff') : 
                       (lang === 'sw' ? 'Raia' : 'Citizen')}
                    </p>
                  </div>
                </div>
              )}

              <button 
                onClick={() => {
                  signOut();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-3 py-4 text-red-600 hover:bg-red-50 rounded-2xl font-medium transition-all"
              >
                <LogOut size={20} />
                <span>{lang === 'sw' ? 'Ondoka' : 'Sign Out'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}