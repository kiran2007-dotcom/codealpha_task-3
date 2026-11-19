import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Pause,
  Play,
  Trash2,
  X,
} from 'lucide-react';
import { useSocialActions } from '../contexts/SocialActionsContext';
import { formatRelativeTime, formatTimeRemaining } from '../lib/validation';
import type { Story, StoryView, UserPublic } from '../types/social';
import { Avatar } from './Avatar';

interface StoryViewerModalProps {
  stories: Story[];
  initialIndex: number;
  currentUser: UserPublic;
  usersMap: Record<string, UserPublic>;
  onClose: () => void;
  onOpenProfile: (uid: string) => void;
}

const STORY_DURATION_MS = 6000;

export function StoryViewerModal({
  stories,
  initialIndex,
  currentUser,
  usersMap,
  onClose,
  onOpenProfile,
}: StoryViewerModalProps) {
  const actions = useSocialActions();
  const [index, setIndex] = useState(
    Math.max(0, Math.min(initialIndex, Math.max(0, stories.length - 1)))
  );
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<StoryView[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const story = stories[index];

  // Record view whenever active story changes
  useEffect(() => {
    if (!story) return;
    setProgress(0);
    setShowViewers(false);
    void actions.recordStoryView(story).catch(() => {});
  }, [actions, story]);

  // Auto-advance timer
  useEffect(() => {
    if (!story || paused || showViewers) return;
    const stepMs = 50;
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (stepMs / STORY_DURATION_MS) * 100;
        if (next >= 100) {
          if (index < stories.length - 1) {
            setIndex((i) => i + 1);
          } else {
            onClose();
          }
          return 0;
        }
        return next;
      });
    }, stepMs);
    return () => clearInterval(timer);
  }, [index, onClose, paused, showViewers, stories.length, story]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && index < stories.length - 1) setIndex((i) => i + 1);
      if (e.key === 'ArrowLeft' && index > 0) setIndex((i) => i - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, onClose, stories.length]);

  if (!story) return null;

  const author = usersMap[story.authorId];
  const authorName = author?.fullName || story.authorName;
  const authorUsername = author?.username || story.authorUsername;
  const authorAvatar = author?.avatarUrl ?? story.authorAvatarUrl;
  const isOwner = story.authorId === currentUser.uid && !story.isDemo;

  const handleOpenViewers = async () => {
    const nextOpen = !showViewers;
    setShowViewers(nextOpen);
    if (nextOpen) {
      setLoadingViewers(true);
      try {
        const list = await actions.fetchStoryViews(story.id);
        setViewers(list);
      } finally {
        setLoadingViewers(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!isOwner || deleting) return;
    setDeleting(true);
    try {
      await actions.deleteStory(story.id);
      actions.showToast('Story deleted');
      if (stories.length <= 1) {
        onClose();
      } else if (index >= stories.length - 1) {
        setIndex(Math.max(0, stories.length - 2));
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Story viewer"
      className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md h-[84vh] max-h-[720px] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col justify-between"
      >
        {/* Background Media */}
        <img
          src={story.mediaUrl}
          alt={`Story by ${authorName}`}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80 pointer-events-none" />

        {/* Top Progress & Author Header */}
        <div className="relative z-10 p-4 space-y-3">
          {/* Progress segments */}
          <div className="flex items-center gap-1">
            {stories.map((s, idx) => (
              <div
                key={s.id}
                className="flex-1 h-1 bg-white/25 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width:
                      idx < index
                        ? '100%'
                        : idx === index
                        ? `${Math.min(100, progress)}%`
                        : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenProfile(story.authorId);
              }}
              className="flex items-center gap-2.5 min-w-0 text-left group"
            >
              <Avatar src={authorAvatar} name={authorName} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate group-hover:underline">
                  {authorName}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-300">
                  <span>@{authorUsername}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span className="font-mono-num">{formatRelativeTime(story.createdAt)}</span>
                  {story.isDemo && (
                    <>
                      <span aria-hidden="true">&middot;</span>
                      <span>Demo story</span>
                    </>
                  )}
                </div>
              </div>
            </button>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? 'Resume story' : 'Pause story'}
                className="p-1.5 text-white/85 hover:text-white rounded-lg hover:bg-white/10"
              >
                {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  aria-label="Delete story"
                  className="p-1.5 text-white/85 hover:text-red-400 rounded-lg hover:bg-white/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close story viewer"
                className="p-1.5 text-white/85 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tap Zones for Previous / Next */}
        <div className="relative z-10 flex-1 flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => index > 0 && setIndex((i) => i - 1)}
            disabled={index === 0}
            aria-label="Previous story"
            className="w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/65 disabled:opacity-0 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => (index < stories.length - 1 ? setIndex((i) => i + 1) : onClose())}
            aria-label="Next story"
            className="w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/65 transition-opacity"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Caption, Expiration & Viewers Bar */}
        <div className="relative z-10 p-4 space-y-3">
          {story.caption && (
            <p className="text-sm text-white leading-relaxed drop-shadow-xs">{story.caption}</p>
          )}

          <div className="flex items-center justify-between text-xs text-zinc-200 pt-2 border-t border-white/15">
            <button
              type="button"
              onClick={() => void handleOpenViewers()}
              className="inline-flex items-center gap-1.5 font-medium hover:text-white"
            >
              <Eye className="w-4 h-4" />
              <span className="font-mono-num">{story.viewsCount}</span>
              <span>{story.viewsCount === 1 ? 'viewer' : 'viewers'}</span>
            </button>
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-300 font-mono-num">
              <Clock className="w-3.5 h-3.5" />
              {formatTimeRemaining(story.expiresAt)}
            </span>
          </div>
        </div>

        {/* Expandable Story Viewers Drawer */}
        {showViewers && (
          <div className="absolute inset-x-0 bottom-0 z-20 max-h-[60%] bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 rounded-t-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Story viewers ({viewers.length})
              </span>
              <button
                type="button"
                onClick={() => setShowViewers(false)}
                className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
              {loadingViewers ? (
                <div className="p-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  Loading viewers...
                </div>
              ) : viewers.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  No viewers recorded yet.
                </div>
              ) : (
                viewers.map((v) => (
                  <button
                    key={v.viewerId}
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenProfile(v.viewerId);
                    }}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={v.viewerAvatarUrl} name={v.viewerName} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {v.viewerName}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          @{v.viewerUsername}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono-num text-[11px] text-zinc-400 shrink-0">
                      {formatRelativeTime(v.viewedAt)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
