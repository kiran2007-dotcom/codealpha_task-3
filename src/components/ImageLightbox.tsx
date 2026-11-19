import { useEffect } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface ImageLightboxProps {
  imageUrl: string;
  alt: string;
  onClose: () => void;
}

export function ImageLightbox({ imageUrl, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      role="dialog"
      aria-modal="true"
      aria-label="Full resolution image preview"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-xs flex items-center justify-center p-4 sm:p-8"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image preview"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <motion.img
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        src={imageUrl}
        alt={alt}
        referrerPolicy="no-referrer"
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[88vh] rounded-xl object-contain border border-white/10"
      />
    </motion.div>
  );
}
