import React, { createContext, useContext } from 'react';
import type { Comment, Post, Story, StoryView, UserPublic } from '../types/social';

export interface SocialActions {
  isPrototypeMode: boolean;
  createPost: (content: string, imageUrl: string) => Promise<void>;
  updatePost: (postId: string, content: string, imageUrl: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  toggleLike: (post: Post, currentlyLiked: boolean) => Promise<void>;
  toggleBookmark: (post: Post, currentlyBookmarked: boolean) => Promise<void>;
  createStory: (mediaUrl: string, caption: string) => Promise<void>;
  deleteStory: (storyId: string) => Promise<void>;
  recordStoryView: (story: Story) => Promise<void>;
  fetchStoryViews: (storyId: string) => Promise<StoryView[]>;
  addComment: (post: Post, content: string) => Promise<void>;
  editComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string, postId: string) => Promise<void>;
  subscribeComments: (
    postId: string,
    onComments: (comments: Comment[]) => void,
    onError: (err: unknown) => void
  ) => () => void;
  toggleFollow: (targetUser: UserPublic, currentlyFollowing: boolean) => Promise<void>;
  fetchFollowConnections: (userId: string) => Promise<{ followers: string[]; following: string[] }>;
  updateProfile: (updates: {
    fullName: string;
    username: string;
    bio: string;
    location: string;
    avatarUrl: string;
    coverUrl: string;
  }) => Promise<void>;
  uploadImage: (file: File, folder: 'avatars' | 'covers' | 'posts') => Promise<string>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: (notificationIds: string[]) => Promise<void>;
  sendMessage: (recipient: UserPublic, content: string) => Promise<void>;
  markMessagesRead: (messageIds: string[]) => Promise<void>;
  showToast: (text: string, tone?: 'default' | 'success') => void;
  openLightbox: (imageUrl: string, alt: string) => void;
  resetPrototype?: () => void;
}

const SocialActionsContext = createContext<SocialActions | null>(null);

export function SocialActionsProvider({
  value,
  children,
}: {
  value: SocialActions;
  children: React.ReactNode;
}) {
  return (
    <SocialActionsContext.Provider value={value}>
      {children}
    </SocialActionsContext.Provider>
  );
}

export function useSocialActions(): SocialActions {
  const ctx = useContext(SocialActionsContext);
  if (!ctx) {
    throw new Error('useSocialActions must be used inside SocialActionsProvider');
  }
  return ctx;
}
