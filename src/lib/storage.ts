import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from './firebase';
import { BLUEPRINT_LIMITS } from '../types/social';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Only JPEG, PNG, WebP, and GIF images are supported.';
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'Image must be 5 MB or smaller.';
  }
  return null;
}

/**
 * Uploads an image via Firebase Storage when configured, with automatic fallback
 * to the authenticated Express /api/upload media endpoint if Storage rules/CORS are unconfigured.
 */
export async function uploadImageAsset(
  file: File,
  folder: 'avatars' | 'covers' | 'posts'
): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to upload images.');
  }

  // Attempt Firebase Storage first with a short timeout fallback
  try {
    const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
    const objectRef = ref(storage, `${folder}/${user.uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);
    const uploadPromise = uploadBytes(objectRef, file, { contentType: file.type }).then((snap) =>
      getDownloadURL(snap.ref)
    );
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Storage upload timeout')), 4500)
    );
    const url = await Promise.race([uploadPromise, timeoutPromise]);
    if (url.length <= BLUEPRINT_LIMITS.urlMax) {
      return url;
    }
  } catch {
    // Fall back to authenticated Node.js /api/upload service
  }

  const token = await user.getIdToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'Image upload failed.');
  }

  const result = (await response.json()) as { url: string };
  return result.url;
}
