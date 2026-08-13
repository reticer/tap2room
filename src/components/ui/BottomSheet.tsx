import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  bgClass?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children, bgClass = 'bg-ios-card dark:bg-ios-darkCard' }) => {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className={`relative w-full max-w-md mx-auto ${bgClass} rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex flex-col max-h-[85vh]`}
            style={{ paddingBottom: 'var(--safe-area-bottom)' }}
          >
            {/* Drag Handle Indicator */}
            <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
