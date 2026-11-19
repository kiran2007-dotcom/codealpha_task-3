import { BLUEPRINT_LIMITS, BLUEPRINT_PATTERNS } from '../types/social';

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Email address is required.';
  if (trimmed.length > BLUEPRINT_LIMITS.emailMax) {
    return `Email must be ${BLUEPRINT_LIMITS.emailMax} characters or fewer.`;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return 'Please enter a valid email address.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
  return null;
}

export function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (trimmed.length < BLUEPRINT_LIMITS.usernameMin) {
    return `Username must be at least ${BLUEPRINT_LIMITS.usernameMin} characters.`;
  }
  if (trimmed.length > BLUEPRINT_LIMITS.usernameMax) {
    return `Username must be ${BLUEPRINT_LIMITS.usernameMax} characters or fewer.`;
  }
  if (!BLUEPRINT_PATTERNS.username.test(trimmed)) {
    return 'Username may only contain letters, numbers, and underscores.';
  }
  return null;
}

export function validateFullName(fullName: string): string | null {
  const trimmed = fullName.trim();
  if (trimmed.length < BLUEPRINT_LIMITS.fullNameMin) {
    return 'Full name is required.';
  }
  if (trimmed.length > BLUEPRINT_LIMITS.fullNameMax) {
    return `Full name must be ${BLUEPRINT_LIMITS.fullNameMax} characters or fewer.`;
  }
  return null;
}

export function sanitizeString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#([a-zA-Z0-9_]+)/g);
  if (!matches) return [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of matches) {
    const clean = raw.slice(1).toLowerCase().slice(0, BLUEPRINT_LIMITS.hashtagMax);
    if (clean.length >= 1 && !seen.has(clean)) {
      seen.add(clean);
      tags.push(clean);
      if (tags.length >= BLUEPRINT_LIMITS.maxHashtags) break;
    }
  }
  return tags;
}

export function formatRelativeTime(dateInput: Date | { toDate: () => Date } | null | undefined): string {
  if (!dateInput) return 'Just now';
  const date = dateInput instanceof Date ? dateInput : dateInput.toDate();
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatFullDate(dateInput: Date | { toDate: () => Date } | null | undefined): string {
  if (!dateInput) return '';
  const date = dateInput instanceof Date ? dateInput : dateInput.toDate();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTimeRemaining(expiresAt: Date | { toDate: () => Date } | null | undefined): string {
  if (!expiresAt) return '24h left';
  const date = expiresAt instanceof Date ? expiresAt : expiresAt.toDate();
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${Math.max(1, diffMin)}m left`;
  const diffHr = Math.ceil(diffMin / 60);
  return `${diffHr}h left`;
}
