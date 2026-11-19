import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  tone?: 'default' | 'success';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-16 md:bottom-5 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex items-center gap-2.5 bg-zinc-900 text-white px-4 py-2.5 rounded-xl border border-zinc-800 shadow-lg text-xs font-medium"
          >
            {toast.tone === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-zinc-400 shrink-0" />
            )}
            <span className="flex-1">{toast.text}</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="text-zinc-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
