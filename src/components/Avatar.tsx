import { useState } from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-24 h-24 text-2xl',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const sizeClass = SIZE_CLASSES[size];

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={`${name} avatar`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${sizeClass} rounded-full object-cover bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={`${name} avatar`}
      className={`${sizeClass} rounded-full bg-zinc-900 dark:bg-zinc-800 text-white dark:text-zinc-100 border border-zinc-800 dark:border-zinc-700 font-display font-semibold flex items-center justify-center shrink-0 select-none ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
