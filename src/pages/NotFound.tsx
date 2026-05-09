import React from 'react';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search, HelpCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface NotFoundProps {
  onNavigate: (view: 'dashboard' | 'services') => void;
}

export function NotFound({ onNavigate }: NotFoundProps) {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-linear-to-br from-stone-50 to-stone-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-lg w-full text-center"
      >
        {/* 404 Illustration with Animation */}
        <div className="mb-10 relative">
          <motion.div 
            className="text-[180px] font-black text-emerald-100 leading-none select-none"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 20 }}
          >
            404
          </motion.div>

          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            initial={{ rotate: -12, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 150 }}
          >
            <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-emerald-100/50">
              <Search size={72} className="text-emerald-600" />
            </div>
          </motion.div>
        </div>

        {/* Message */}
        <h1 className="text-4xl font-bold text-stone-900 mb-4 tracking-tight">
          {lang === 'sw' ? 'Ukurasa Haujapatikana' : 'Page Not Found'}
        </h1>
        
        <p className="text-stone-600 text-lg max-w-sm mx-auto leading-relaxed mb-10">
          {lang === 'sw' 
            ? 'Samahani, ukurasa unaoutafuta haupo au umehamishwa mahali pengine.'
            : 'Sorry, the page you are looking for does not exist or has been moved.'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate('dashboard')}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-emerald-200 transition-all"
          >
            <Home size={24} />
            {lang === 'sw' ? 'Rudi Nyumbani' : 'Go Home'}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate('services')}
            className="flex-1 sm:flex-none bg-white border-2 border-stone-300 hover:border-stone-400 text-stone-700 px-10 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all"
          >
            <ArrowLeft size={24} />
            {lang === 'sw' ? 'Angalia Huduma' : 'Browse Services'}
          </motion.button>
        </div>

        {/* Help Section */}
        <div className="mt-16 pt-8 border-t border-stone-200">
          <p className="flex items-center justify-center gap-2 text-sm text-stone-500">
            <HelpCircle size={18} className="text-emerald-500" />
            {lang === 'sw' 
              ? 'Unahitaji msaada? Wasiliana na msaada wa wateja.'
              : 'Need help? Contact customer support.'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}