// src/components/layout/Header.tsx
import React from 'react';
import { LogOut, Menu, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { TANZANIA_LOGO_URL } from '@/constants/services';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/rbac';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();

  const role = user?.role || 'citizen';

  return (
    <header className="bg-white border-b border-stone-200 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      {/* Left Section - Logo + Mobile Menu */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="p-2 -ml-2 lg:hidden hover:bg-stone-100 rounded-xl text-stone-500 transition-colors"
            aria-label={lang === 'sw' ? 'Fungua menyu' : 'Open menu'}
          >
            <Menu size={24} />
          </button>
        )}

        {/* Logo */}
        <div className="flex items-center gap-3">
          <img 
            src={TANZANIA_LOGO_URL} 
            alt="Jamhuri ya Muungano wa Tanzania" 
            className="w-9 h-9 sm:w-11 sm:h-11 object-contain"
            referrerPolicy="no-referrer"
          />
          
          <div className="hidden xs:block">
            <div className="font-black text-2xl tracking-[-0.02em] text-stone-900 leading-none">
              E-MTAA
            </div>
            <div className="text-[10px] font-bold text-emerald-600 tracking-[0.5px] -mt-0.5">
              PORTAL
            </div>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Language Switcher */}
        <div className="flex bg-stone-100 rounded-full p-1 border border-stone-200">
          <button 
            onClick={() => setLang('sw')}
            className={cn(
              "px-3.5 py-1 text-xs font-bold rounded-full transition-all",
              lang === 'sw' 
                ? "bg-white shadow-sm text-emerald-700" 
                : "text-stone-500 hover:text-stone-700"
            )}
          >
            SW
          </button>
          <button 
            onClick={() => setLang('en')}
            className={cn(
              "px-3.5 py-1 text-xs font-bold rounded-full transition-all",
              lang === 'en' 
                ? "bg-white shadow-sm text-emerald-700" 
                : "text-stone-500 hover:text-stone-700"
            )}
          >
            EN
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="hidden md:flex items-center gap-3 pr-2">
            <div className="text-right">
              <p className="font-semibold text-stone-800 text-sm leading-tight">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-[10px] text-stone-500 capitalize font-medium">
                {role === 'admin' ? (lang === 'sw' ? 'Msimamizi' : 'Administrator') :
                 role === 'staff' ? (lang === 'sw' ? 'Mtumishi' : 'Staff') : 
                 (lang === 'sw' ? 'Raia' : 'Citizen')}
              </p>
            </div>

            {/* User Avatar */}
            <div className="w-9 h-9 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 font-semibold border border-emerald-200">
              {user.first_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        )}

        {/* Sign Out Button */}
        <button 
          onClick={signOut}
          className="p-2.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          aria-label={lang === 'sw' ? 'Ondoka' : 'Sign Out'}
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}