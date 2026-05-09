import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, RefreshCw, Lock } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { HARDCODED_SERVICES } from '@/constants/services';
import { Service } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency';
import { 
  FileCheck2, Users2, PartyPopper, Skull
} from 'lucide-react';

interface ServicesProps {
  onSelectService: (service: Service) => void;
  onRefresh?: () => void;
}

// Simple cn utility
const cn = (...classes: (string | boolean | undefined | null)[]) => 
  classes.filter(Boolean).join(' ');

export function Services({ onSelectService, onRefresh }: ServicesProps) {
  const { lang, currency } = useLanguage();
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [onRefresh]);

  const getServiceIcon = (name: string) => {
    if (name.includes('Cheti cha Mkazi') || name.includes('Residency')) return FileCheck2;
    if (name.includes('Utambulisho') || name.includes('Introduction')) return Users2;
    if (name.includes('Tukio') || name.includes('Event')) return PartyPopper;
    if (name.includes('Mazishi') || name.includes('Burial')) return Skull;
    return FileCheck2;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-stone-900">
            {lang === 'sw' ? 'Huduma Zinazopatikana' : 'Available Services'}
          </h2>
          <p className="text-stone-500 font-medium">
            {lang === 'sw' ? 'Chagua huduma unayoihitaji na ufanye maombi.' : 'Choose the service you need and make an application.'}
          </p>
        </div>
        
        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-semibold text-sm hover:bg-emerald-100 transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            {lang === 'sw' ? 'Onyesha Upya' : 'Refresh'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {HARDCODED_SERVICES.map((service: Service) => {
          const Icon = getServiceIcon(service.name);
          const isVerified = !!user?.is_verified;
          
          return (
            <div 
              key={service.id} 
              className={cn(
                "bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-stone-100 shadow-sm transition-all flex flex-col relative overflow-hidden",
                isVerified 
                  ? "hover:shadow-xl hover:border-emerald-500 cursor-pointer group" 
                  : "opacity-75 cursor-not-allowed"
              )}
              onClick={() => isVerified && onSelectService(service)}
            >
              <div className="flex justify-between items-start mb-6">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                  isVerified ? "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100" : "bg-stone-100 text-stone-400"
                )}>
                  <Icon size={24} />
                </div>
                <div className="bg-orange-50 text-orange-800 px-4 py-1.5 rounded-full text-xs font-bold border border-orange-100">
                  {formatCurrency(service.fee, currency)}
                </div>
              </div>
              
              <div className="space-y-1 mb-6">
                <h3 className="font-bold text-xl text-stone-900 tracking-tight">
                  {lang === 'sw' ? service.name : (service as any).name_en || service.name}
                </h3>
                <p className="text-sm font-medium text-stone-400">
                  {lang === 'sw' ? (service as any).name_en || 'Service' : service.name}
                </p>
              </div>
              
              <p className="text-base text-stone-500 mb-8 line-clamp-3 leading-relaxed font-medium flex-1">
                {lang === 'sw' ? service.description : (service as any).description_en || service.description}
              </p>
              
              <div className="mt-auto">
                <button 
                  disabled={!isVerified}
                  className={cn(
                    "w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg",
                    isVerified 
                      ? "bg-[#2471A3] text-white hover:bg-[#1F618D] group-hover:scale-[1.02]" 
                      : "bg-stone-200 text-stone-500 shadow-none"
                  )}
                >
                  {isVerified ? (
                    <>
                      {lang === 'sw' ? 'Omba Sasa' : 'Apply Now'}
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  ) : (
                    <>
                      <Lock size={18} />
                      {lang === 'sw' ? 'Inasubiri Uhakiki' : 'Pending Verification'}
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}