import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'success' | 'info';
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Thibitisha',
  cancelText = 'Ghairi',
  type = 'info'
}: ConfirmationModalProps) {
  const typeStyles = {
    danger: 'bg-red-50 text-red-600',
    warning: 'bg-amber-50 text-amber-600',
    success: 'bg-emerald-50 text-emerald-600',
    info: 'bg-blue-50 text-blue-600',
  };

  const buttonStyles = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-amber-600 hover:bg-amber-700',
    success: 'bg-emerald-600 hover:bg-emerald-700',
    info: 'bg-stone-900 hover:bg-black',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${typeStyles[type]}`}>
                  <AlertCircle size={28} />
                </div>
                <button 
                  onClick={onClose}
                  title="Funga dirisha la uthibitisho"
                  aria-label="Funga dirisha la uthibitisho"
                  className="text-stone-400 hover:text-stone-600 p-2 -mr-2 -mt-2"
                >
                  <X size={24} />
                </button>
              </div>

              <h3 className="text-2xl font-bold text-stone-900 mb-3">{title}</h3>
              <p className="text-stone-600 leading-relaxed">{message}</p>
            </div>

            <div className="border-t p-4 flex gap-3 bg-stone-50">
              <button
                onClick={onClose}
                className="flex-1 h-14 bg-white border border-stone-200 hover:bg-stone-100 rounded-2xl font-semibold text-stone-700 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 h-14 text-white rounded-2xl font-semibold transition-all ${buttonStyles[type]}`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}