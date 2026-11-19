import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Bookmark, Edit2, Heart, MessageCircle, Send, Share2, Trash2, X } from 'lucide-react';
import { useSocialActions } from '../contexts/SocialActionsContext';
import { formatFullDate, formatRelativeTime } from '../lib/validation';
import { BLUEPRINT_LIMITS, type Comment, type Post, type UserPublic } from '../types/social';
import { Avatar } from './Avatar';
import { RichPostText } from './RichPostText';

interface PostDetailModalProps {
  post: Post;
  usersMap: Record<string, UserPublic>;
  currentUser: UserPublic;
  isLiked: boolean;
  isBookmarked: boolean;
  onClose: () => void;
  onOpenProfile: (uid: string) => void;
  onSelectHashtag?: (tag: string) => void;
}

export function PostDetailModal({
  post,
  usersMap,
  currentUser,
  isLiked,
  isBookmarked,
  onClose,
  onOpenProfile,
  onSelectHashtag,
}: PostDetailModalProps) {
  const actions = useSocialActions();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingComments(true);
    const unsubscribe = actions.subscribeComments(
      post.id,
      (loaded) => {
        setComments(loaded);
        setLoadingComments(false);
      },
      () => {
        setLoadingComments(false);
      }
    );
    return unsubscribe;
  }, [actions, post.id]);

  const postAuthor = usersMap[post.authorId];
  const authorName = postAuthor?.fullName || post.authorName;
  const authorUsername = postAuthor?.username || post.authorUsername;
  const authorAvatar = postAuthor?.avatarUrl ?? post.authorAvatarUrl;
  const isDemoPost = Boolean(post.isDemo || postAuthor?.isDemo);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await actions.addComment(post, newComment);
      setNewComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCommentEdit = async (commentId: string) => {
    if (!editingContent.trim()) return;
    setError(null);
    try {
      await actions.editComment(commentId, editingContent);
      setEditingCommentId(null);
      setEditingContent('');
      actions.showToast('Comment updated', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to edit comment.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setError(null);
    try {
      await actions.deleteComment(commentId, post.id);
      actions.showToast('Comment deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete comment.');
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${window.location.origin}/?post=${post.id}`);
      }
      actions.showToast('Post link copied to clipboard', 'success');
    } catch {
      actions.showToast('Unable to copy link');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      role="dialog"
      aria-modal="true"
      aria-label="Post details"
      className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <h2 className="text-base font-display font-bold text-zinc-900 dark:text-zinc-100">
            Post thread
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close post details"
            className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenProfile(post.authorId);
                }}
              >
                <Avatar src={authorAvatar} name={authorName} size="md" />
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenProfile(post.authorId);
                  }}
                  className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:underline block text-left"
                >
                  {authorName}
                </button>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>@{authorUsername}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span className="font-mono-num">{formatFullDate(post.createdAt)}</span>
                  {isDemoPost && (
                    <>
                      <span aria-hidden="true">&middot;</span>
                      <span>Demo post</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {post.content && (
              <p className="text-[15px] text-zinc-900 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap mb-3">
                <RichPostText
                  text={post.content}
                  onSelectHashtag={(tag) => {
                    onClose();
                    onSelectHashtag?.(tag);
                  }}
                />
              </p>
            )}

            {post.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 mb-4">
                <img
                  src={post.imageUrl}
                  alt={`Post image by ${authorName}`}
                  referrerPolicy="no-referrer"
                  onClick={() =>
                    actions.openLightbox(post.imageUrl, `Post photo by ${authorName}`)
                  }
                  className="w-full max-h-[420px] object-cover cursor-zoom-in"
                />
              </div>
            )}

            <div className="flex items-center gap-5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => void actions.toggleLike(post, isLiked)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium py-1 px-2 rounded-md transition-colors ${
                  isLiked
                    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-600 dark:fill-red-400' : ''}`} />
                <span className="font-mono-num">{post.likesCount}</span>
                <span>{post.likesCount === 1 ? 'Like' : 'Likes'}</span>
              </button>

              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <MessageCircle className="w-4 h-4" />
                <span className="font-mono-num">{post.commentsCount}</span>
                <span>{post.commentsCount === 1 ? 'Comment' : 'Comments'}</span>
              </div>

              <button
                type="button"
                onClick={() => void actions.toggleBookmark(post, isBookmarked)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium py-1 px-2 rounded-md transition-colors ${
                  isBookmarked
                    ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Bookmark
                  className={`w-4 h-4 ${isBookmarked ? 'fill-zinc-900 dark:fill-zinc-100' : ''}`}
                />
                <span>{isBookmarked ? 'Saved' : 'Save'}</span>
              </button>

              <button
                type="button"
                onClick={() => void handleShare()}
                className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 py-1 px-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {loadingComments ? (
              <div className="p-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No comments yet. Start the conversation below.
              </div>
            ) : (
              comments.map((comment) => {
                const cAuthor = usersMap[comment.authorId];
                const cName = cAuthor?.fullName || comment.authorName;
                const cUsername = cAuthor?.username || comment.authorUsername;
                const cAvatar = cAuthor?.avatarUrl ?? comment.authorAvatarUrl;
                const isCommentOwner = comment.authorId === currentUser.uid;
                const isEditing = editingCommentId === comment.id;

                return (
                  <div key={comment.id} className="px-5 py-4 flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenProfile(comment.authorId);
                      }}
                    >
                      <Avatar src={cAvatar} name={cName} size="sm" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenProfile(comment.authorId);
                            }}
                            className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline truncate"
                          >
                            {cName}
                          </button>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            @{cUsername}
                          </span>
                          <span aria-hidden="true" className="text-xs text-zinc-300 dark:text-zinc-700">
                            &middot;
                          </span>
                          <span className="font-mono-num text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>

                        {isCommentOwner && !isEditing && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingContent(comment.content);
                              }}
                              aria-label="Edit comment"
                              className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteComment(comment.id)}
                              aria-label="Delete comment"
                              className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <input
                            type="text"
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            maxLength={BLUEPRINT_LIMITS.commentContentMax}
                            className="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingCommentId(null)}
                              className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 px-2 py-1"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleSaveCommentEdit(comment.id)}
                              className="text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1 rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                          {comment.content}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <form
          onSubmit={handleAddComment}
          className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shrink-0"
        >
          {error && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>}
          <div className="flex items-center gap-3">
            <Avatar src={currentUser.avatarUrl} name={currentUser.fullName} size="sm" />
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a reply..."
              maxLength={BLUEPRINT_LIMITS.commentContentMax}
              className="flex-1 px-3.5 py-2 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Reply</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
