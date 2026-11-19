import type { Timestamp } from 'firebase/firestore';

export const BLUEPRINT_LIMITS = {
  idMax: 128,
  usernameMin: 3,
  usernameMax: 30,
  fullNameMin: 1,
  fullNameMax: 80,
  bioMax: 280,
  locationMax: 80,
  urlMax: 2048,
  emailMax: 254,
  postContentMax: 2000,
  hashtagMax: 32,
  maxHashtags: 10,
  storyCaptionMax: 200,
  commentContentMin: 1,
  commentContentMax: 1000,
  notificationMessageMax: 240,
  conversationLastMessageMax: 500,
  messageContentMin: 1,
  messageContentMax: 1500,
} as const;

export const BLUEPRINT_PATTERNS = {
  id: /^[a-zA-Z0-9_-]+$/,
  username: /^[a-zA-Z0-9_]+$/,
  usernameLower: /^[a-z0-9_]+$/,
} as const;

export interface UserPublic {
  uid: string;
  username: string;
  usernameLower: string;
  fullName: string;
  fullNameLower: string;
  bio: string;
  location: string;
  avatarUrl: string;
  coverUrl: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isPublic: boolean;
  isDemo: boolean;
  joinedAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorName: string;
  authorAvatarUrl: string;
  content: string;
  imageUrl: string;
  hashtags: string[];
  visibility: 'public';
  isDemo: boolean;
  likesCount: number;
  commentsCount: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Story {
  id: string;
  authorId: string;
  authorUsername: string;
  authorName: string;
  authorAvatarUrl: string;
  mediaUrl: string;
  caption: string;
  isPublic: boolean;
  isDemo: boolean;
  viewsCount: number;
  createdAt: Timestamp | null;
  expiresAt: Timestamp | null;
}

export interface StoryView {
  viewerId: string;
  viewerUsername: string;
  viewerName: string;
  viewerAvatarUrl: string;
  viewedAt: Timestamp | null;
}

export interface Bookmark {
  userId: string;
  postId: string;
  postAuthorId: string;
  createdAt: Timestamp | null;
}

export interface PostLike {
  postId: string;
  userId: string;
  postAuthorId: string;
  createdAt: Timestamp | null;
}

export interface Comment {
  id: string;
  postId: string;
  postAuthorId: string;
  authorId: string;
  authorUsername: string;
  authorName: string;
  authorAvatarUrl: string;
  content: string;
  isPublic: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface FollowEdge {
  followerId: string;
  followingId: string;
  isPublic: boolean;
  createdAt: Timestamp | null;
}

export type NotificationType = 'follow' | 'like' | 'comment' | 'message';

export interface NotificationItem {
  id: string;
  recipientId: string;
  actorId: string;
  actorUsername: string;
  actorName: string;
  actorAvatarUrl: string;
  type: NotificationType;
  postId: string;
  message: string;
  read: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessage: string;
  lastSenderId: string;
  lastMessageAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  participantIds: string[];
  content: string;
  read: boolean;
  createdAt: Timestamp | null;
}

export type ActiveTab = 'feed' | 'discover' | 'bookmarks' | 'notifications' | 'messages' | 'profile';
