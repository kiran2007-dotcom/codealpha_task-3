import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Bookmark,
  Edit2,
  Expand,
  Heart,
  ImageOff,
  MessageCircle,
  Share2,
  Trash2,
} from 'lucide-react';
import { useSocialActions } from '../contexts/SocialActionsContext';
import { formatFullDate, formatRelativeTime } from '../lib/validation';
import { BLUEPRINT_LIMITS, type Post, type UserPublic } from '../types/social';
import { Avatar } from './Avatar';
import { RichPostText } from './RichPostText';

interface PostCardProps {
  post: Post;
  author?: UserPublic;
  currentUser: UserPublic;
  isLiked: boolean;
  isBookmarked: boolean;
  onOpenProfile: (uid: string) => void;
  onOpenPostDetail: (post: Post) => void;
  onSelectHashtag?: (tag: string) => void;
}

export function PostCard({
  post,
  author,
  currentUser,
  isLiked,
  isBookmarked,
  onOpenProfile,
  onOpenPostDetail,
  onSelectHashtag,
}: PostCardProps) {
  const actions = useSocialActions();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [bookmarkPending, setBookmarkPending] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const displayName = author?.fullName || post.authorName;
  const displayUsername = author?.username || post.authorUsername;
  const displayAvatar = author?.avatarUrl ?? post.authorAvatarUrl;
  const isOwner = post.authorId === currentUser.uid && !post.isDemo;
  const isDemoPost = Boolean(post.isDemo || author?.isDemo);

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (likePending) return;
    setLikePending(true);
    setActionError(null);
    try {
      await actions.toggleLike(post, isLiked);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update like.');
    } finally {
      setLikePending(false);
    }
  };

  const handleToggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (bookmarkPending) return;
    setBookmarkPending(true);
    setActionError(null);
    try {
      await actions.toggleBookmark(post, isBookmarked);
      actions.showToast(isBookmarked ? 'Removed from bookmarks' : 'Saved to bookmarks', 'success');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update bookmark.');
    } finally {
      setBookmarkPending(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContent.trim() && !post.imageUrl) return;
    setSaving(true);
    setActionError(null);
    try {
      await actions.updatePost(post.id, editContent, post.imageUrl);
      setEditing(false);
      actions.showToast('Post updated', 'success');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update post.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setActionError(null);
    try {
      await actions.deletePost(post.id);
      actions.showToast('Post deleted');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete post.');
      setDeleting(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `${displayName} (@${displayUsername}) on ConnectSphere: ${post.content.slice(0, 120)}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${window.location.origin}/?post=${post.id}`);
      }
      actions.showToast('Post link copied to clipboard', 'success');
    } catch {
      actions.showToast(shareText);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="border-b border-zinc-200 dark:border-zinc-800 px-5 py-5 bg-white dark:bg-zinc-950 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors"
    >
      <div className="flex items-start gap-3.5">
        <button
          type="button"
          onClick={() => onOpenProfile(post.authorId)}
          className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 rounded-full"
        >
          <Avatar src={displayAvatar} name={displayName} size="md" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
              <button
                type="button"
                onClick={() => onOpenProfile(post.authorId)}
                className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:underline truncate"
              >
                {displayName}
              </button>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                @{displayUsername}
              </span>
              <span aria-hidden="true" className="text-xs text-zinc-300 dark:text-zinc-700">
                &middot;
              </span>
              <time
                title={formatFullDate(post.createdAt)}
                className="font-mono-num text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap"
              >
                {formatRelativeTime(post.createdAt)}
              </time>
              {isDemoPost && (
                <>
                  <span aria-hidden="true" className="text-xs text-zinc-300 dark:text-zinc-700">
                    &middot;
                  </span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                    Demo post
                  </span>
                </>
              )}
            </div>

            {isOwner && !editing && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditContent(post.content);
                    setEditing(true);
                    setConfirmDelete(false);
                  }}
                  aria-label="Edit post"
                  className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {confirmDelete ? (
                  <div className="flex items-center gap-1.5 ml-1">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 whitespace-nowrap"
                    >
                      {deleting ? 'Deleting...' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 whitespace-nowrap"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    aria-label="Delete post"
                    className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSaveEdit} className="mt-2.5 space-y-2.5">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                maxLength={BLUEPRINT_LIMITS.postContentMax}
                className="w-full p-3 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || (!editContent.trim() && !post.imageUrl)}
                  className="px-3.5 py-1.5 text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          ) : (
            <>
              {post.content && (
                <div
                  onClick={() => onOpenPostDetail(post)}
                  className="mt-2 text-[15px] text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap break-words cursor-pointer"
                >
                  <RichPostText text={post.content} onSelectHashtag={onSelectHashtag} />
                </div>
              )}

              {post.imageUrl && (
                <div className="relative group mt-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                  {imageError ? (
                    <div className="h-48 flex flex-col items-center justify-center text-zinc-400 gap-2">
                      <ImageOff className="w-5 h-5" />
                      <span className="text-xs">Image unavailable</span>
                    </div>
                  ) : (
                    <>
                      <img
                        src={post.imageUrl}
                        alt={`Post image by ${displayName}`}
                        referrerPolicy="no-referrer"
                        onError={() => setImageError(true)}
                        onClick={() => onOpenPostDetail(post)}
                        className="w-full max-h-[460px] object-cover cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          actions.openLightbox(post.imageUrl, `Post photo by ${displayName}`);
                        }}
                        aria-label="Expand image"
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-zinc-900/80 text-white flex items-center justify-center hover:bg-zinc-900"
                      >
                        <Expand className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {actionError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{actionError}</p>}

          <div className="flex items-center gap-4 mt-3.5">
            <button
              type="button"
              onClick={handleToggleLike}
              disabled={likePending}
              aria-label={isLiked ? 'Unlike post' : 'Like post'}
              className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors py-1 px-1.5 -ml-1.5 rounded-md ${
                isLiked
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-600 dark:fill-red-400' : ''}`} />
              <span className="font-mono-num">{post.likesCount}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPostDetail(post)}
              aria-label="Open comments"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 py-1 px-1.5 rounded-md transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="font-mono-num">{post.commentsCount}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleBookmark}
              disabled={bookmarkPending}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
              className={`inline-flex items-center gap-1 text-xs font-medium py-1 px-1.5 rounded-md transition-colors ${
                isBookmarked
                  ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              <Bookmark
                className={`w-4 h-4 ${
                  isBookmarked ? 'fill-zinc-900 dark:fill-zinc-100' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={handleShare}
              aria-label="Copy post link"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 py-1 px-1.5 rounded-md transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onOpenPostDetail(post)}
              className="ml-auto text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors whitespace-nowrap"
            >
              View thread
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
