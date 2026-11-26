import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  disableClose?: boolean;
  fullscreen?: boolean;
  size?: ModalSize;
  showCloseButton?: boolean;
  bgClass?: string;
  panelClassName?: string;
  bodyClassName?: string;
  ariaLabel?: string;
  zIndex?: number;
}

interface ModalStackEntry {
  id: symbol;
  onCloseRef: React.RefObject<() => void>;
  disableCloseRef: React.RefObject<boolean>;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  xs: 'max-w-[340px]',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
};

const modalStack: ModalStackEntry[] = [];
let previousBodyOverflow: string | null = null;

function handleGlobalKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  const top = modalStack[modalStack.length - 1];
  if (!top || top.disableCloseRef.current) return;
  event.preventDefault();
  top.onCloseRef.current();
}

function registerModal(entry: ModalStackEntry): number {
  const existingIndex = modalStack.findIndex((item) => item.id === entry.id);
  if (existingIndex !== -1) {
    return existingIndex;
  }

  if (modalStack.length === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleGlobalKeyDown);
  }

  modalStack.push(entry);
  return modalStack.length - 1;
}

function unregisterModal(id: symbol) {
  const index = modalStack.findIndex((item) => item.id === id);
  if (index !== -1) {
    modalStack.splice(index, 1);
  }

  if (modalStack.length === 0) {
    window.removeEventListener('keydown', handleGlobalKeyDown);
    document.body.style.overflow = previousBodyOverflow ?? '';
    previousBodyOverflow = null;
  }
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  disableClose = false,
  fullscreen = false,
  size = 'md',
  showCloseButton = true,
  bgClass,
  panelClassName = '',
  bodyClassName = 'p-4 sm:p-5 overflow-y-auto flex-1 min-h-0',
  ariaLabel,
  zIndex,
}) => {
  const titleId = useId();
  const modalIdRef = useRef<symbol | null>(null);
  if (modalIdRef.current === null) {
    modalIdRef.current = Symbol('modal');
  }

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const disableCloseRef = useRef(disableClose);
  disableCloseRef.current = disableClose;

  const [stackDepth, setStackDepth] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const id = modalIdRef.current!;
    const depth = registerModal({ id, onCloseRef, disableCloseRef });
    setStackDepth(depth);
    return () => {
      unregisterModal(id);
    };
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  const hasTitle = title !== undefined && title !== null && title !== false;
  const resolvedZIndex = zIndex ?? 80 + stackDepth * 10;
  const zClass =
    stackDepth === 0 ? 'z-[80]' : stackDepth === 1 ? 'z-[90]' : 'z-[100]';

  const panelBaseClass = fullscreen
    ? `relative z-10 w-full h-full max-w-none max-h-none rounded-none ${
        bgClass ?? 'bg-white/90 dark:bg-gray-950/90'
      } backdrop-blur-xl flex flex-col overflow-hidden ${panelClassName}`
    : `relative z-10 w-full ${SIZE_CLASSES[size]} ${
        bgClass ?? 'bg-white/85 dark:bg-gray-900/85'
      } backdrop-blur-xl rounded-3xl border border-white/60 dark:border-white/10 shadow-2xl shadow-black/15 dark:shadow-black/50 overflow-hidden flex flex-col max-h-[90vh] ${panelClassName}`;

  const handleCloseClick = () => {
    if (!disableClose) {
      onClose();
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          data-testid="modal-overlay"
          style={{ zIndex: resolvedZIndex }}
          className={`fixed inset-0 ${zClass} flex items-center justify-center ${
            fullscreen ? 'p-0' : 'p-4'
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget && !disableClose) {
              onClose();
            }
          }}
        >
          {/* Full-screen iOS Frosted Backdrop (strictly without transform-gpu to avoid Safari blur clipping) */}
          <motion.div
            aria-hidden="true"
            data-testid="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              if (!disableClose) {
                onClose();
              }
            }}
            className={`fixed inset-0 ${
              fullscreen
                ? 'bg-black/75 dark:bg-black/85 backdrop-blur-md'
                : 'bg-black/35 dark:bg-black/55 backdrop-blur-md'
            }`}
          />

          {/* Centered Modal Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={hasTitle ? titleId : undefined}
            aria-label={!hasTitle ? (ariaLabel ?? 'Dialog') : undefined}
            data-fullscreen={fullscreen ? 'true' : undefined}
            initial={
              fullscreen
                ? { opacity: 0, scale: 0.97 }
                : { opacity: 0, scale: 0.94, y: 16 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              fullscreen
                ? { opacity: 0, scale: 0.97 }
                : { opacity: 0, scale: 0.94, y: 16 }
            }
            transition={{ type: 'spring', stiffness: 360, damping: 28, mass: 0.8 }}
            onClick={(e) => e.stopPropagation()}
            className={panelBaseClass}
          >
            {hasTitle ? (
              <div
                className={`flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200/60 dark:border-white/10 shrink-0 ${
                  fullscreen ? 'pt-[calc(env(safe-area-inset-top,0px)+1rem)]' : ''
                }`}
              >
                <h2
                  id={titleId}
                  className="text-lg font-bold text-gray-900 dark:text-white flex-1 min-w-0"
                >
                  {title}
                </h2>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={handleCloseClick}
                    disabled={disableClose}
                    aria-label="Close modal"
                    className="p-2 rounded-full bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                )}
              </div>
            ) : (
              showCloseButton && (
                <button
                  type="button"
                  onClick={handleCloseClick}
                  disabled={disableClose}
                  aria-label="Close modal"
                  className={`absolute right-4 z-20 p-2 rounded-full bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    fullscreen
                      ? 'top-[calc(env(safe-area-inset-top,0px)+1rem)]'
                      : 'top-4'
                  }`}
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              )
            )}

            <div className={bodyClassName}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
