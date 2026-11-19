import React, { useMemo, useRef, useState } from 'react';
import { Clock, ImagePlus, Loader2, Plus, X } from 'lucide-react';
import { useSocialActions } from '../contexts/SocialActionsContext';
import { BLUEPRINT_LIMITS, type Story, type UserPublic } from '../types/social';
import { Avatar } from './Avatar';

interface StoriesBarProps {
  currentUser: UserPublic;
  usersMap: Record<string, UserPublic>;
  stories: Story[];
  viewedStoryIds: Set<string>;
  onOpenAuthorStories: (authorId: string) => void;
}

export function StoriesBar({
  currentUser,
  usersMap,
  stories,
  viewedStoryIds,
  onOpenAuthorStories,
}: StoriesBarProps) {
  const actions = useSocialActions();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group active stories by author (current user first if they have active stories)
  const authorGroups = useMemo(() => {
    const map = new Map<string, Story[]>();
    for (const s of stories) {
      const existing = map.get(s.authorId) || [];
      existing.push(s);
      map.set(s.authorId, existing);
    }
    const groups = Array.from(map.entries()).map(([authorId, authorStories]) => {
      const sorted = [...authorStories].sort(
        (a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0)
      );
      const hasUnseen = sorted.some(
        (st) => st.authorId !== currentUser.uid && !viewedStoryIds.has(st.id)
      );
      const latestTs = sorted[sorted.length - 1]?.createdAt?.toMillis() ?? 0;
      return {
        authorId,
        stories: sorted,
        hasUnseen,
        latestTs,
      };
    });

    groups.sort((a, b) => {
      if (a.authorId === currentUser.uid) return -1;
      if (b.authorId === currentUser.uid) return 1;
      if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
      return b.latestTs - a.latestTs;
    });

    return groups;
  }, [currentUser.uid, stories, viewedStoryIds]);

  const ownStories = useMemo(
    () => stories.filter((s) => s.authorId === currentUser.uid),
    [currentUser.uid, stories]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await actions.uploadImage(file, 'posts');
      setMediaUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload story image.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl) return;
    setError(null);
    setSubmitting(true);
    try {
      await actions.createStory(mediaUrl, caption);
      setMediaUrl('');
      setCaption('');
      setUploadOpen(false);
      actions.showToast('Story published for 24 hours', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish story.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section
        aria-label="Stories"
        className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-5 py-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Stories</h2>
            <span aria-hidden="true" className="text-xs text-zinc-300 dark:text-zinc-700">
              &middot;
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">24h highlights</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add story</span>
          </button>
        </div>

        <div className="flex items-start gap-4 overflow-x-auto pb-1">
          {/* Add Story Tile */}
          <button
            type="button"
            onClick={() =>
              ownStories.length > 0 ? onOpenAuthorStories(currentUser.uid) : setUploadOpen(true)
            }
            className="flex flex-col items-center gap-1.5 shrink-0 w-16 group"
          >
            <div className="relative p-0.5 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 group-hover:border-zinc-900 dark:group-hover:border-zinc-300 transition-colors">
              <Avatar src={currentUser.avatarUrl} name={currentUser.fullName} size="lg" />
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadOpen(true);
                }}
                title="Upload a new story"
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center border-2 border-white dark:border-zinc-950"
              >
                <Plus className="w-3 h-3" />
              </span>
            </div>
            <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate w-full text-center">
              {ownStories.length > 0 ? 'Your story' : 'New story'}
            </span>
          </button>

          {/* Author Story Rings */}
          {authorGroups
            .filter((g) => g.authorId !== currentUser.uid)
            .map((group) => {
              const latest = group.stories[group.stories.length - 1];
              const author = usersMap[group.authorId];
              const displayName = author?.fullName || latest.authorName;
              const shortLabel = displayName.split(' ')[0];
              const avatar = author?.avatarUrl ?? latest.authorAvatarUrl;

              return (
                <button
                  key={group.authorId}
                  type="button"
                  onClick={() => onOpenAuthorStories(group.authorId)}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-16 group"
                >
                  <div
                    className={`p-0.5 rounded-full border-2 transition-colors ${
                      group.hasUnseen
                        ? 'border-zinc-900 dark:border-zinc-100'
                        : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <Avatar src={avatar} name={displayName} size="lg" />
                  </div>
                  <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate w-full text-center group-hover:text-zinc-900 dark:group-hover:text-white">
                    {shortLabel}
                  </span>
                </button>
              );
            })}
        </div>
      </section>

      {uploadOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Upload story"
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setUploadOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h2 className="text-base font-display font-bold text-zinc-900 dark:text-zinc-100">
                  Add to your story
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>Visible to the community for 24 hours</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                aria-label="Close story upload modal"
                className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStory} className="p-5 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />

              {mediaUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950">
                  <img
                    src={mediaUrl}
                    alt="Story upload preview"
                    className="w-full max-h-72 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setMediaUrl('')}
                    aria-label="Remove story image"
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-zinc-900/80 text-white flex items-center justify-center hover:bg-zinc-900"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-44 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400 hover:border-zinc-900 dark:hover:border-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <ImagePlus className="w-6 h-6" />
                  )}
                  <span className="text-xs font-medium">
                    {uploading ? 'Uploading image...' : 'Choose a photo for your story'}
                  </span>
                  <span className="text-[11px] text-zinc-400">JPG, PNG, WEBP, GIF up to 5MB</span>
                </button>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Caption (optional)
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={BLUEPRINT_LIMITS.storyCaptionMax}
                  placeholder="Share a quick moment or #topic..."
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                />
                <p className="text-[11px] text-zinc-400 text-right font-mono-num mt-1">
                  {caption.length}/{BLUEPRINT_LIMITS.storyCaptionMax}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!mediaUrl || uploading || submitting}
                  className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-40"
                >
                  {submitting ? 'Sharing...' : 'Share story'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
