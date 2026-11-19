import React, { useRef, useState } from 'react';
import { Hash, ImagePlus, Loader2, X } from 'lucide-react';
import { useSocialActions } from '../contexts/SocialActionsContext';
import { BLUEPRINT_LIMITS, type UserPublic } from '../types/social';
import { Avatar } from './Avatar';

interface PostComposerProps {
  currentUser: UserPublic;
}

export function PostComposer({ currentUser }: PostComposerProps) {
  const actions = useSocialActions();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const uploadedUrl = await actions.uploadImage(file, 'posts');
      setImageUrl(uploadedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await processFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !imageUrl) return;

    setError(null);
    setSubmitting(true);
    try {
      await actions.createPost(content, imageUrl);
      setContent('');
      setImageUrl('');
      actions.showToast('Post published', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish post.');
    } finally {
      setSubmitting(false);
    }
  };

  const remainingChars = BLUEPRINT_LIMITS.postContentMax - content.length;

  return (
    <form
      onSubmit={handleSubmit}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`border-b border-zinc-200 dark:border-zinc-800 px-5 py-5 transition-colors ${
        dragging ? 'bg-zinc-50 dark:bg-zinc-900' : 'bg-white dark:bg-zinc-950'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <Avatar src={currentUser.avatarUrl} name={currentUser.fullName} size="md" />
        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share an update, code note, or photo — add #hashtags to categorize..."
            rows={3}
            maxLength={BLUEPRINT_LIMITS.postContentMax}
            className="w-full resize-none text-[15px] leading-relaxed text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none bg-transparent"
          />

          {imageUrl && (
            <div className="relative mt-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <img
                src={imageUrl}
                alt="Post attachment preview"
                referrerPolicy="no-referrer"
                className="w-full max-h-80 object-cover"
              />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                aria-label="Remove image"
                className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-zinc-900/80 text-white flex items-center justify-center hover:bg-zinc-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || submitting}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4" />
                )}
                <span>{uploading ? 'Uploading...' : 'Add photo'}</span>
              </button>
              <button
                type="button"
                onClick={() => setContent((c) => (c.endsWith(' ') || c === '' ? `${c}#` : `${c} #`))}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors"
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Tag</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`font-mono-num text-xs ${
                  remainingChars < 100
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {remainingChars}
              </span>
              <button
                type="submit"
                disabled={submitting || uploading || (!content.trim() && !imageUrl)}
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                {submitting ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
