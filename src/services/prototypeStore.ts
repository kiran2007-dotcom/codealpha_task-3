import { Timestamp } from 'firebase/firestore';
import {
  buildDemoObjectsForPrototype,
  COASTAL_PHOTO_IMAGE,
  HERO_STUDIO_IMAGE,
} from './demoSeed';
import type {
  Comment,
  Conversation,
  MessageItem,
  NotificationItem,
  Post,
  Story,
  StoryView,
  UserPublic,
} from '../types/social';

export interface PrototypeState {
  currentUserId: string;
  users: Record<string, UserPublic>;
  posts: Post[];
  stories: Story[];
  storyViews: Record<string, StoryView[]>;
  comments: Comment[];
  likedPostIds: string[];
  bookmarkedPostIds: string[];
  followingEdges: { followerId: string; followingId: string }[];
  notifications: NotificationItem[];
  conversations: Conversation[];
  messages: MessageItem[];
}

const STORAGE_KEY = 'connectsphere_prototype_state_v2';

function tsMinutesAgo(minutes: number): Timestamp {
  return Timestamp.fromMillis(Date.now() - minutes * 60 * 1000);
}

function tsDaysAgo(days: number): Timestamp {
  return Timestamp.fromMillis(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function createInitialPrototypeState(): PrototypeState {
  const demo = buildDemoObjectsForPrototype();

  const mayaProfile: UserPublic = {
    uid: 'proto_maya',
    username: 'maya_lin',
    usernameLower: 'maya_lin',
    fullName: 'Maya Lin',
    fullNameLower: 'maya lin',
    bio: 'Product designer & photographer exploring tactile software, typography, and weekend alpine trails.',
    location: 'San Francisco, CA',
    avatarUrl: '',
    coverUrl: COASTAL_PHOTO_IMAGE,
    postsCount: 1,
    followersCount: 2,
    followingCount: 3,
    isPublic: true,
    isDemo: false,
    joinedAt: tsDaysAgo(48),
    updatedAt: tsMinutesAgo(15),
  };

  const mayaPost: Post = {
    id: 'proto_post_maya_1',
    authorId: 'proto_maya',
    authorUsername: 'maya_lin',
    authorName: 'Maya Lin',
    authorAvatarUrl: '',
    content:
      'Testing a quieter studio layout with dark mode contrast tokens and clean hairline dividers. #design #technology',
    imageUrl: HERO_STUDIO_IMAGE,
    hashtags: ['design', 'technology'],
    visibility: 'public',
    isDemo: false,
    likesCount: 4,
    commentsCount: 1,
    createdAt: tsMinutesAgo(52),
    updatedAt: tsMinutesAgo(52),
  };

  const mayaStory: Story = {
    id: 'proto_story_maya_1',
    authorId: 'proto_maya',
    authorUsername: 'maya_lin',
    authorName: 'Maya Lin',
    authorAvatarUrl: '',
    mediaUrl: COASTAL_PHOTO_IMAGE,
    caption: 'Morning coastline walk before studio hours #travel',
    isPublic: true,
    isDemo: false,
    viewsCount: 2,
    createdAt: tsMinutesAgo(190),
    expiresAt: Timestamp.fromMillis(Date.now() + 20 * 60 * 60 * 1000),
  };

  const users: Record<string, UserPublic> = {
    proto_maya: mayaProfile,
    ...demo.users,
  };

  const posts: Post[] = [mayaPost, ...demo.posts];
  const stories: Story[] = [mayaStory, ...demo.stories];

  const storyViews: Record<string, StoryView[]> = {
    [mayaStory.id]: [
      {
        viewerId: 'demo_tech_alex',
        viewerUsername: users.demo_tech_alex.username,
        viewerName: users.demo_tech_alex.fullName,
        viewerAvatarUrl: '',
        viewedAt: tsMinutesAgo(120),
      },
      {
        viewerId: 'demo_photo_marcus',
        viewerUsername: users.demo_photo_marcus.username,
        viewerName: users.demo_photo_marcus.fullName,
        viewerAvatarUrl: '',
        viewedAt: tsMinutesAgo(65),
      },
    ],
  };

  const comments: Comment[] = [
    {
      id: 'proto_comment_1',
      postId: mayaPost.id,
      postAuthorId: 'proto_maya',
      authorId: 'demo_tech_alex',
      authorUsername: users.demo_tech_alex.username,
      authorName: users.demo_tech_alex.fullName,
      authorAvatarUrl: '',
      content: 'The spacing on those typography scales feels crisp in both themes.',
      isPublic: true,
      createdAt: tsMinutesAgo(30),
      updatedAt: tsMinutesAgo(30),
    },
    {
      id: 'proto_comment_2',
      postId: 'demo_post_tech_1',
      postAuthorId: 'demo_tech_alex',
      authorId: 'demo_college_priya',
      authorUsername: users.demo_college_priya.username,
      authorName: users.demo_college_priya.fullName,
      authorAvatarUrl: '',
      content: 'Making state transitions explicit eliminated an entire class of bugs in our lab project too.',
      isPublic: true,
      createdAt: tsMinutesAgo(18),
      updatedAt: tsMinutesAgo(18),
    },
    {
      id: 'proto_comment_3',
      postId: 'demo_post_photo_1',
      postAuthorId: 'demo_photo_marcus',
      authorId: 'proto_maya',
      authorUsername: 'maya_lin',
      authorName: 'Maya Lin',
      authorAvatarUrl: '',
      content: 'The contrast on that concrete staircase is razor sharp.',
      isPublic: true,
      createdAt: tsMinutesAgo(40),
      updatedAt: tsMinutesAgo(40),
    },
  ];

  // Align starter comment count on demo_post_tech_1 / demo_post_photo_1 in prototype state
  for (const p of posts) {
    if (p.id === 'demo_post_tech_1') {
      p.commentsCount = 1;
      p.likesCount = 2;
    } else if (p.id === 'demo_post_photo_1') {
      p.commentsCount = 1;
      p.likesCount = 3;
    }
  }

  const followingEdges = [
    { followerId: 'proto_maya', followingId: 'demo_tech_alex' },
    { followerId: 'proto_maya', followingId: 'demo_photo_marcus' },
    { followerId: 'proto_maya', followingId: 'demo_travel_liam' },
    { followerId: 'demo_tech_alex', followingId: 'proto_maya' },
    { followerId: 'demo_photo_marcus', followingId: 'proto_maya' },
  ];

  // Reflect initial follower counts on demo targets in prototype state
  users.demo_tech_alex.followersCount = 1;
  users.demo_photo_marcus.followersCount = 1;
  users.demo_travel_liam.followersCount = 1;

  const notifications: NotificationItem[] = [
    {
      id: 'proto_notif_1',
      recipientId: 'proto_maya',
      actorId: 'demo_tech_alex',
      actorUsername: users.demo_tech_alex.username,
      actorName: users.demo_tech_alex.fullName,
      actorAvatarUrl: '',
      type: 'comment',
      postId: mayaPost.id,
      message: `${users.demo_tech_alex.fullName} commented on your post.`,
      read: false,
      createdAt: tsMinutesAgo(30),
      updatedAt: tsMinutesAgo(30),
    },
    {
      id: 'proto_notif_2',
      recipientId: 'proto_maya',
      actorId: 'demo_photo_marcus',
      actorUsername: users.demo_photo_marcus.username,
      actorName: users.demo_photo_marcus.fullName,
      actorAvatarUrl: '',
      type: 'like',
      postId: mayaPost.id,
      message: `${users.demo_photo_marcus.fullName} liked your post.`,
      read: false,
      createdAt: tsMinutesAgo(44),
      updatedAt: tsMinutesAgo(44),
    },
    {
      id: 'proto_notif_3',
      recipientId: 'proto_maya',
      actorId: 'demo_tech_alex',
      actorUsername: users.demo_tech_alex.username,
      actorName: users.demo_tech_alex.fullName,
      actorAvatarUrl: '',
      type: 'follow',
      postId: '',
      message: `${users.demo_tech_alex.fullName} started following you.`,
      read: true,
      createdAt: tsDaysAgo(1),
      updatedAt: tsDaysAgo(1),
    },
  ];

  const conv1Id = ['demo_code_elena', 'proto_maya'].sort().join('_');
  const conv2Id = ['demo_tech_alex', 'proto_maya'].sort().join('_');

  const conversations: Conversation[] = [
    {
      id: conv1Id,
      participantIds: ['demo_code_elena', 'proto_maya'].sort(),
      lastMessage: 'Would love to collaborate on studio shots for the autumn collection.',
      lastSenderId: 'demo_code_elena',
      lastMessageAt: tsMinutesAgo(45),
      createdAt: tsDaysAgo(2),
      updatedAt: tsMinutesAgo(45),
    },
    {
      id: conv2Id,
      participantIds: ['demo_tech_alex', 'proto_maya'].sort(),
      lastMessage: 'Thanks for sharing the TypeScript schema notes!',
      lastSenderId: 'proto_maya',
      lastMessageAt: tsMinutesAgo(240),
      createdAt: tsDaysAgo(4),
      updatedAt: tsMinutesAgo(240),
    },
  ];

  const messages: MessageItem[] = [
    {
      id: 'proto_msg_1',
      conversationId: conv1Id,
      senderId: 'proto_maya',
      receiverId: 'demo_code_elena',
      participantIds: ['demo_code_elena', 'proto_maya'].sort(),
      content: 'Your new charcoal glaze series looks remarkable in natural light.',
      read: true,
      createdAt: tsMinutesAgo(60),
    },
    {
      id: 'proto_msg_2',
      conversationId: conv1Id,
      senderId: 'demo_code_elena',
      receiverId: 'proto_maya',
      participantIds: ['demo_code_elena', 'proto_maya'].sort(),
      content: 'Thank you! Would love to collaborate on studio shots for the autumn collection.',
      read: false,
      createdAt: tsMinutesAgo(45),
    },
    {
      id: 'proto_msg_3',
      conversationId: conv2Id,
      senderId: 'demo_tech_alex',
      receiverId: 'proto_maya',
      participantIds: ['demo_tech_alex', 'proto_maya'].sort(),
      content: 'Just pushed the updated edge caching write-up.',
      read: true,
      createdAt: tsMinutesAgo(260),
    },
    {
      id: 'proto_msg_4',
      conversationId: conv2Id,
      senderId: 'proto_maya',
      receiverId: 'demo_tech_alex',
      participantIds: ['demo_tech_alex', 'proto_maya'].sort(),
      content: 'Thanks for sharing the TypeScript schema notes!',
      read: true,
      createdAt: tsMinutesAgo(240),
    },
  ];

  return {
    currentUserId: 'proto_maya',
    users,
    posts,
    stories,
    storyViews,
    comments,
    likedPostIds: ['demo_post_photo_1', 'demo_post_tech_1'],
    bookmarkedPostIds: ['demo_post_tech_1', 'demo_post_travel_1'],
    followingEdges,
    notifications,
    conversations,
    messages,
  };
}

function reviveTimestamp(raw: unknown): Timestamp {
  if (raw && typeof raw === 'object' && 'seconds' in raw && 'nanoseconds' in raw) {
    const t = raw as { seconds: number; nanoseconds: number };
    return new Timestamp(t.seconds, t.nanoseconds);
  }
  return Timestamp.now();
}

export function loadPrototypeState(): PrototypeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialPrototypeState();
    const parsed = JSON.parse(raw) as PrototypeState;
    for (const uid of Object.keys(parsed.users)) {
      parsed.users[uid].joinedAt = reviveTimestamp(parsed.users[uid].joinedAt);
      parsed.users[uid].updatedAt = reviveTimestamp(parsed.users[uid].updatedAt);
    }
    parsed.posts = (parsed.posts || []).map((p) => ({
      ...p,
      hashtags: p.hashtags || [],
      isDemo: Boolean(p.isDemo),
      createdAt: reviveTimestamp(p.createdAt),
      updatedAt: reviveTimestamp(p.updatedAt),
    }));
    parsed.stories = (parsed.stories || []).map((s) => ({
      ...s,
      createdAt: reviveTimestamp(s.createdAt),
      expiresAt: reviveTimestamp(s.expiresAt),
    }));
    const revivedViews: Record<string, StoryView[]> = {};
    for (const [sid, views] of Object.entries(parsed.storyViews || {})) {
      revivedViews[sid] = views.map((v) => ({
        ...v,
        viewedAt: reviveTimestamp(v.viewedAt),
      }));
    }
    parsed.storyViews = revivedViews;
    parsed.bookmarkedPostIds = parsed.bookmarkedPostIds || [];
    parsed.comments = (parsed.comments || []).map((c) => ({
      ...c,
      createdAt: reviveTimestamp(c.createdAt),
      updatedAt: reviveTimestamp(c.updatedAt),
    }));
    parsed.notifications = (parsed.notifications || []).map((n) => ({
      ...n,
      createdAt: reviveTimestamp(n.createdAt),
      updatedAt: reviveTimestamp(n.updatedAt),
    }));
    parsed.conversations = (parsed.conversations || []).map((cv) => ({
      ...cv,
      lastMessageAt: reviveTimestamp(cv.lastMessageAt),
      createdAt: reviveTimestamp(cv.createdAt),
      updatedAt: reviveTimestamp(cv.updatedAt),
    }));
    parsed.messages = (parsed.messages || []).map((m) => ({
      ...m,
      createdAt: reviveTimestamp(m.createdAt),
    }));
    return parsed;
  } catch {
    return createInitialPrototypeState();
  }
}

export function savePrototypeState(state: PrototypeState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage quota errors
  }
}

export function resetPrototypeState(): PrototypeState {
  const fresh = createInitialPrototypeState();
  savePrototypeState(fresh);
  return fresh;
}
