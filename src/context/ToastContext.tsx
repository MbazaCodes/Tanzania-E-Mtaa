// src/context/ToastContext.tsx
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const newToast: Toast = { id, message, type, duration };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Toast Container - positioned outside normal flow */}
      <div className="fixed bottom-6 right-6 z-300 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 30, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto"
            >
              <div className={`
                flex items-start gap-3 px-5 py-4 rounded-2xl shadow-xl border min-w-[320px] max-w-md
                ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                  toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-900' :
                  toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                  'bg-blue-50 border-blue-200 text-blue-900'}
              `}>
                <div className="mt-0.5 shrink-0">
                  {toast.type === 'success' && <CheckCircle size={22} className="text-emerald-600" />}
                  {toast.type === 'error' && <XCircle size={22} className="text-red-600" />}
                  {toast.type === 'warning' && <AlertCircle size={22} className="text-amber-600" />}
                  {toast.type === 'info' && <Info size={22} className="text-blue-600" />}
                </div>

                <p className="text-sm font-medium flex-1 leading-snug pr-2">{toast.message}</p>

                <button
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 p-1 -mr-1 -mt-1 text-stone-400 hover:text-stone-600 hover:bg-black/10 rounded-full transition-all"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}