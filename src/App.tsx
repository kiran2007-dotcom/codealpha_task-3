import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, limit, onSnapshot, query, Timestamp, where } from 'firebase/firestore';
import { Bookmark, Hash, LogOut, Moon, Search, Sun } from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import { Avatar } from './components/Avatar';
import { DiscoverView } from './components/DiscoverView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ImageLightbox } from './components/ImageLightbox';
import { MessagesView } from './components/MessagesView';
import { NotificationsView } from './components/NotificationsView';
import { PostCard } from './components/PostCard';
import { PostComposer } from './components/PostComposer';
import { PostDetailModal } from './components/PostDetailModal';
import { ProfileView } from './components/ProfileView';
import { Sidebar } from './components/Sidebar';
import { StoriesBar } from './components/StoriesBar';
import { StoryViewerModal } from './components/StoryViewerModal';
import { ToastContainer, type ToastMessage } from './components/Toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocialActionsProvider, type SocialActions } from './contexts/SocialActionsContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { uploadImageAsset, validateImageFile } from './lib/storage';
import { extractHashtags, sanitizeString } from './lib/validation';
import { seedDemoContentIfNeeded } from './services/demoSeed';
import {
  loadPrototypeState,
  resetPrototypeState,
  savePrototypeState,
  type PrototypeState,
} from './services/prototypeStore';
import {
  addComment as fbAddComment,
  createPost as fbCreatePost,
  createStory as fbCreateStory,
  deleteComment as fbDeleteComment,
  deletePost as fbDeletePost,
  deleteStory as fbDeleteStory,
  editComment as fbEditComment,
  fetchFollowConnections as fbFetchFollowConnections,
  fetchStoryViews as fbFetchStoryViews,
  getConversationId,
  markAllNotificationsRead as fbMarkAllNotificationsRead,
  markMessagesRead as fbMarkMessagesRead,
  markNotificationRead as fbMarkNotificationRead,
  recordStoryView as fbRecordStoryView,
  sendDirectMessage as fbSendDirectMessage,
  toggleFollowUser as fbToggleFollowUser,
  togglePostBookmark as fbTogglePostBookmark,
  togglePostLike as fbTogglePostLike,
  updatePost as fbUpdatePost,
  updateUserProfile as fbUpdateUserProfile,
} from './services/socialService';
import {
  BLUEPRINT_LIMITS,
  type ActiveTab,
  type Bookmark as BookmarkDoc,
  type Comment,
  type Conversation,
  type FollowEdge,
  type MessageItem,
  type NotificationItem,
  type Post,
  type PostLike,
  type Story,
  type UserPublic,
} from './types/social';

const FEED_PAGE_SIZE = 5;

function ConnectSphereWorkspace() {
  const {
    firebaseUser,
    userProfile,
    authLoading,
    profileLoading,
    isEmailVerified,
    needsProfileSetup,
    isPrototypeMode,
    logout,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<ActiveTab>('feed');
  const [feedMode, setFeedMode] = useState<'all' | 'following'>('all');
  const [visibleFeedCount, setVisibleFeedCount] = useState(FEED_PAGE_SIZE);
  const [viewedProfileId, setViewedProfileId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [storyViewerStartIndex, setStoryViewerStartIndex] = useState<number | null>(null);
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());
  const [quickSearch, setQuickSearch] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Live Firestore state
  const [fbUsers, setFbUsers] = useState<UserPublic[]>([]);
  const [fbPosts, setFbPosts] = useState<Post[]>([]);
  const [fbStories, setFbStories] = useState<Story[]>([]);
  const [fbLikedPostIds, setFbLikedPostIds] = useState<Set<string>>(new Set());
  const [fbBookmarkedPostIds, setFbBookmarkedPostIds] = useState<Set<string>>(new Set());
  const [fbFollowingIds, setFbFollowingIds] = useState<Set<string>>(new Set());
  const [fbNotifications, setFbNotifications] = useState<NotificationItem[]>([]);
  const [fbConversations, setFbConversations] = useState<Conversation[]>([]);
  const [fbMessages, setFbMessages] = useState<MessageItem[]>([]);
  const [fbDataLoading, setFbDataLoading] = useState(true);

  // Prototype state
  const [protoState, setProtoState] = useState<PrototypeState>(() => loadPrototypeState());

  const updateProto = useCallback((updater: (prev: PrototypeState) => PrototypeState) => {
    setProtoState((prev) => {
      const next = updater(prev);
      savePrototypeState(next);
      return next;
    });
  }, []);

  const showToast = useCallback((text: string, tone: 'default' | 'success' = 'default') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const openLightbox = useCallback((url: string, alt: string) => {
    setLightboxImage({ url, alt });
  }, []);

  // Seed initial demo accounts/posts/stories into Firestore once for authenticated users
  useEffect(() => {
    if (isPrototypeMode || !firebaseUser || !isEmailVerified || !userProfile) return;
    void seedDemoContentIfNeeded();
  }, [firebaseUser, isEmailVerified, isPrototypeMode, userProfile]);

  useEffect(() => {
    if (isPrototypeMode || !firebaseUser || !isEmailVerified || !userProfile) return;

    setFbDataLoading(true);

    const usersQuery = query(
      collection(db, 'users'),
      where('isPublic', '==', true),
      limit(200)
    );
    const unsubUsers = onSnapshot(
      usersQuery,
      (snap) => setFbUsers(snap.docs.map((d) => d.data() as UserPublic)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const postsQuery = query(
      collection(db, 'posts'),
      where('visibility', '==', 'public'),
      limit(150)
    );
    const unsubPosts = onSnapshot(
      postsQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Post);
        list.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
        setFbPosts(list);
        setFbDataLoading(false);
      },
      (err) => {
        setFbDataLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'posts');
      }
    );

    const storiesQuery = query(
      collection(db, 'stories'),
      where('isPublic', '==', true),
      limit(100)
    );
    const unsubStories = onSnapshot(
      storiesQuery,
      (snap) => {
        const nowMs = Date.now();
        const active = snap.docs
          .map((d) => d.data() as Story)
          .filter((s) => (s.expiresAt?.toMillis() ?? 0) > nowMs);
        active.sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
        setFbStories(active);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'stories')
    );

    const likesQuery = query(
      collection(db, 'likes'),
      where('userId', '==', firebaseUser.uid)
    );
    const unsubLikes = onSnapshot(
      likesQuery,
      (snap) => setFbLikedPostIds(new Set(snap.docs.map((d) => (d.data() as PostLike).postId))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'likes')
    );

    const bookmarksQuery = query(
      collection(db, 'bookmarks'),
      where('userId', '==', firebaseUser.uid)
    );
    const unsubBookmarks = onSnapshot(
      bookmarksQuery,
      (snap) =>
        setFbBookmarkedPostIds(new Set(snap.docs.map((d) => (d.data() as BookmarkDoc).postId))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'bookmarks')
    );

    const followingQuery = query(
      collection(db, 'followers'),
      where('followerId', '==', firebaseUser.uid),
      where('isPublic', '==', true)
    );
    const unsubFollowing = onSnapshot(
      followingQuery,
      (snap) =>
        setFbFollowingIds(new Set(snap.docs.map((d) => (d.data() as FollowEdge).followingId))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'followers')
    );

    const notifQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', firebaseUser.uid),
      limit(100)
    );
    const unsubNotifs = onSnapshot(
      notifQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as NotificationItem);
        list.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
        setFbNotifications(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
    );

    const convQuery = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', firebaseUser.uid)
    );
    const unsubConvs = onSnapshot(
      convQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Conversation);
        list.sort(
          (a, b) => (b.lastMessageAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? 0)
        );
        setFbConversations(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'conversations')
    );

    const msgQuery = query(
      collection(db, 'messages'),
      where('participantIds', 'array-contains', firebaseUser.uid)
    );
    const unsubMsgs = onSnapshot(
      msgQuery,
      (snap) => setFbMessages(snap.docs.map((d) => d.data() as MessageItem)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'messages')
    );

    return () => {
      unsubUsers();
      unsubPosts();
      unsubStories();
      unsubLikes();
      unsubBookmarks();
      unsubFollowing();
      unsubNotifs();
      unsubConvs();
      unsubMsgs();
    };
  }, [firebaseUser, isEmailVerified, isPrototypeMode, userProfile]);

  const activeUser = isPrototypeMode
    ? protoState.users[protoState.currentUserId]
    : userProfile;

  const allUsers = useMemo(
    () => (isPrototypeMode ? Object.values(protoState.users) : fbUsers),
    [fbUsers, isPrototypeMode, protoState.users]
  );

  const usersMap = useMemo(() => {
    const map: Record<string, UserPublic> = {};
    for (const u of allUsers) map[u.uid] = u;
    if (activeUser) map[activeUser.uid] = activeUser;
    return map;
  }, [activeUser, allUsers]);

  const posts = useMemo(
    () =>
      isPrototypeMode
        ? [...protoState.posts].sort(
            (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)
          )
        : fbPosts,
    [fbPosts, isPrototypeMode, protoState.posts]
  );

  const activeStories = useMemo(() => {
    const nowMs = Date.now();
    const list = isPrototypeMode
      ? protoState.stories.filter((s) => (s.expiresAt?.toMillis() ?? 0) > nowMs)
      : fbStories.filter((s) => (s.expiresAt?.toMillis() ?? 0) > nowMs);

    return [...list].sort((a, b) => {
      if (activeUser && a.authorId === activeUser.uid && b.authorId !== activeUser.uid) return -1;
      if (activeUser && b.authorId === activeUser.uid && a.authorId !== activeUser.uid) return 1;
      return (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0);
    });
  }, [activeUser, fbStories, isPrototypeMode, protoState.stories]);

  const likedPostIds = useMemo(
    () => (isPrototypeMode ? new Set(protoState.likedPostIds) : fbLikedPostIds),
    [fbLikedPostIds, isPrototypeMode, protoState.likedPostIds]
  );

  const bookmarkedPostIds = useMemo(
    () => (isPrototypeMode ? new Set(protoState.bookmarkedPostIds) : fbBookmarkedPostIds),
    [fbBookmarkedPostIds, isPrototypeMode, protoState.bookmarkedPostIds]
  );

  const followingIds = useMemo(() => {
    if (!isPrototypeMode) return fbFollowingIds;
    return new Set(
      protoState.followingEdges
        .filter((e) => e.followerId === protoState.currentUserId)
        .map((e) => e.followingId)
    );
  }, [fbFollowingIds, isPrototypeMode, protoState.currentUserId, protoState.followingEdges]);

  const notifications = useMemo(() => {
    if (!isPrototypeMode) return fbNotifications;
    return [...protoState.notifications]
      .filter((n) => n.recipientId === protoState.currentUserId)
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  }, [fbNotifications, isPrototypeMode, protoState.currentUserId, protoState.notifications]);

  const conversations = useMemo(() => {
    if (!isPrototypeMode) return fbConversations;
    return [...protoState.conversations]
      .filter((c) => c.participantIds.includes(protoState.currentUserId))
      .sort((a, b) => (b.lastMessageAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? 0));
  }, [fbConversations, isPrototypeMode, protoState.conversations, protoState.currentUserId]);

  const messages = useMemo(
    () => (isPrototypeMode ? protoState.messages : fbMessages),
    [fbMessages, isPrototypeMode, protoState.messages]
  );

  const socialActions = useMemo<SocialActions>(() => {
    if (!isPrototypeMode && activeUser) {
      return {
        isPrototypeMode: false,
        createPost: async (content, imageUrl) => {
          await fbCreatePost(activeUser, content, imageUrl);
        },
        updatePost: fbUpdatePost,
        deletePost: async (postId) => {
          await fbDeletePost(postId, activeUser.uid);
        },
        toggleLike: async (post, currentlyLiked) => {
          await fbTogglePostLike(post, activeUser, currentlyLiked);
        },
        toggleBookmark: async (post, currentlyBookmarked) => {
          await fbTogglePostBookmark(post, activeUser, currentlyBookmarked);
        },
        createStory: async (mediaUrl, caption) => {
          await fbCreateStory(activeUser, mediaUrl, caption);
        },
        deleteStory: fbDeleteStory,
        recordStoryView: async (story) => {
          setViewedStoryIds((prev) => new Set(prev).add(story.id));
          await fbRecordStoryView(story, activeUser);
        },
        fetchStoryViews: fbFetchStoryViews,
        addComment: async (post, content) => {
          await fbAddComment(post, activeUser, content);
        },
        editComment: fbEditComment,
        deleteComment: fbDeleteComment,
        subscribeComments: (postId, onComments, onError) => {
          const q = query(
            collection(db, 'comments'),
            where('postId', '==', postId),
            where('isPublic', '==', true)
          );
          return onSnapshot(
            q,
            (snapshot) => {
              const loaded = snapshot.docs.map((d) => d.data() as Comment);
              loaded.sort(
                (a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0)
              );
              onComments(loaded);
            },
            (err) => {
              onError(err);
              handleFirestoreError(err, OperationType.LIST, 'comments');
            }
          );
        },
        toggleFollow: async (targetUser, currentlyFollowing) => {
          await fbToggleFollowUser(activeUser, targetUser, currentlyFollowing);
        },
        fetchFollowConnections: fbFetchFollowConnections,
        updateProfile: async (updates) => {
          await fbUpdateUserProfile(activeUser, updates);
        },
        uploadImage: uploadImageAsset,
        markNotificationRead: fbMarkNotificationRead,
        markAllNotificationsRead: fbMarkAllNotificationsRead,
        sendMessage: async (recipient, content) => {
          await fbSendDirectMessage(activeUser, recipient, content);
        },
        markMessagesRead: fbMarkMessagesRead,
        showToast,
        openLightbox,
      };
    }

    // Interactive Prototype Mode Actions
    return {
      isPrototypeMode: true,
      createPost: async (content, imageUrl) => {
        const cleanContent = sanitizeString(content, BLUEPRINT_LIMITS.postContentMax);
        const cleanImageUrl = sanitizeString(imageUrl, BLUEPRINT_LIMITS.urlMax);
        if (!cleanContent && !cleanImageUrl) {
          throw new Error('Please write something or attach an image before posting.');
        }
        const now = Timestamp.now();
        updateProto((prev) => {
          const me = prev.users[prev.currentUserId];
          const newPost: Post = {
            id: `proto_post_${Date.now()}`,
            authorId: me.uid,
            authorUsername: me.username,
            authorName: me.fullName,
            authorAvatarUrl: me.avatarUrl,
            content: cleanContent,
            imageUrl: cleanImageUrl,
            hashtags: extractHashtags(cleanContent),
            visibility: 'public',
            isDemo: false,
            likesCount: 0,
            commentsCount: 0,
            createdAt: now,
            updatedAt: now,
          };
          return {
            ...prev,
            posts: [newPost, ...prev.posts],
            users: {
              ...prev.users,
              [me.uid]: { ...me, postsCount: me.postsCount + 1, updatedAt: now },
            },
          };
        });
      },
      updatePost: async (postId, content, imageUrl) => {
        const cleanContent = sanitizeString(content, BLUEPRINT_LIMITS.postContentMax);
        const now = Timestamp.now();
        const hashtags = extractHashtags(cleanContent);
        updateProto((prev) => ({
          ...prev,
          posts: prev.posts.map((p) =>
            p.id === postId
              ? { ...p, content: cleanContent, imageUrl, hashtags, updatedAt: now }
              : p
          ),
        }));
      },
      deletePost: async (postId) => {
        const now = Timestamp.now();
        updateProto((prev) => {
          const me = prev.users[prev.currentUserId];
          return {
            ...prev,
            posts: prev.posts.filter((p) => p.id !== postId),
            comments: prev.comments.filter((c) => c.postId !== postId),
            likedPostIds: prev.likedPostIds.filter((id) => id !== postId),
            bookmarkedPostIds: prev.bookmarkedPostIds.filter((id) => id !== postId),
            users: {
              ...prev.users,
              [me.uid]: {
                ...me,
                postsCount: Math.max(0, me.postsCount - 1),
                updatedAt: now,
              },
            },
          };
        });
      },
      toggleLike: async (post, currentlyLiked) => {
        const now = Timestamp.now();
        updateProto((prev) => ({
          ...prev,
          likedPostIds: currentlyLiked
            ? prev.likedPostIds.filter((id) => id !== post.id)
            : [...prev.likedPostIds, post.id],
          posts: prev.posts.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  likesCount: Math.max(0, p.likesCount + (currentlyLiked ? -1 : 1)),
                  updatedAt: now,
                }
              : p
          ),
        }));
      },
      toggleBookmark: async (post, currentlyBookmarked) => {
        updateProto((prev) => ({
          ...prev,
          bookmarkedPostIds: currentlyBookmarked
            ? prev.bookmarkedPostIds.filter((id) => id !== post.id)
            : [...prev.bookmarkedPostIds, post.id],
        }));
      },
      createStory: async (mediaUrl, caption) => {
        const cleanMedia = sanitizeString(mediaUrl, BLUEPRINT_LIMITS.urlMax);
        const cleanCaption = sanitizeString(caption, BLUEPRINT_LIMITS.storyCaptionMax);
        if (!cleanMedia) throw new Error('Please upload an image for your story.');
        const now = Timestamp.now();
        const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);
        updateProto((prev) => {
          const me = prev.users[prev.currentUserId];
          const newStory: Story = {
            id: `proto_story_${Date.now()}`,
            authorId: me.uid,
            authorUsername: me.username,
            authorName: me.fullName,
            authorAvatarUrl: me.avatarUrl,
            mediaUrl: cleanMedia,
            caption: cleanCaption,
            isPublic: true,
            isDemo: false,
            viewsCount: 0,
            createdAt: now,
            expiresAt,
          };
          return {
            ...prev,
            stories: [...prev.stories, newStory],
          };
        });
      },
      deleteStory: async (storyId) => {
        updateProto((prev) => ({
          ...prev,
          stories: prev.stories.filter((s) => s.id !== storyId),
        }));
      },
      recordStoryView: async (story) => {
        setViewedStoryIds((prev) => new Set(prev).add(story.id));
        updateProto((prev) => {
          const me = prev.users[prev.currentUserId];
          if (!me || story.authorId === me.uid) return prev;
          const existingViews = prev.storyViews[story.id] || [];
          if (existingViews.some((v) => v.viewerId === me.uid)) return prev;
          const nextView = {
            viewerId: me.uid,
            viewerUsername: me.username,
            viewerName: me.fullName,
            viewerAvatarUrl: me.avatarUrl,
            viewedAt: Timestamp.now(),
          };
          return {
            ...prev,
            storyViews: {
              ...prev.storyViews,
              [story.id]: [nextView, ...existingViews],
            },
            stories: prev.stories.map((s) =>
              s.id === story.id ? { ...s, viewsCount: s.viewsCount + 1 } : s
            ),
          };
        });
      },
      fetchStoryViews: async (storyId) => {
        return protoState.storyViews[storyId] || [];
      },
      addComment: async (post, content) => {
        const cleanContent = sanitizeString(content, BLUEPRINT_LIMITS.commentContentMax);
        if (!cleanContent) throw new Error('Comment cannot be empty.');
        const now = Timestamp.now();
        updateProto((prev) => {
          const me = prev.users[prev.currentUserId];
          const newComment: Comment = {
            id: `proto_comment_${Date.now()}`,
            postId: post.id,
            postAuthorId: post.authorId,
            authorId: me.uid,
            authorUsername: me.username,
            authorName: me.fullName,
            authorAvatarUrl: me.avatarUrl,
            content: cleanContent,
            isPublic: true,
            createdAt: now,
            updatedAt: now,
          };
          return {
            ...prev,
            comments: [...prev.comments, newComment],
            posts: prev.posts.map((p) =>
              p.id === post.id
                ? { ...p, commentsCount: p.commentsCount + 1, updatedAt: now }
                : p
            ),
          };
        });
      },
      editComment: async (commentId, content) => {
        const cleanContent = sanitizeString(content, BLUEPRINT_LIMITS.commentContentMax);
        const now = Timestamp.now();
        updateProto((prev) => ({
          ...prev,
          comments: prev.comments.map((c) =>
            c.id === commentId ? { ...c, content: cleanContent, updatedAt: now } : c
          ),
        }));
      },
      deleteComment: async (commentId, postId) => {
        const now = Timestamp.now();
        updateProto((prev) => ({
          ...prev,
          comments: prev.comments.filter((c) => c.id !== commentId),
          posts: prev.posts.map((p) =>
            p.id === postId
              ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1), updatedAt: now }
              : p
          ),
        }));
      },
      subscribeComments: (postId, onComments) => {
        const filtered = protoState.comments
          .filter((c) => c.postId === postId)
          .sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
        onComments(filtered);
        return () => {};
      },
      toggleFollow: async (targetUser, currentlyFollowing) => {
        const now = Timestamp.now();
        updateProto((prev) => {
          const me = prev.users[prev.currentUserId];
          const target = prev.users[targetUser.uid];
          if (!me || !target || me.uid === target.uid) return prev;
          const edges = currentlyFollowing
            ? prev.followingEdges.filter(
                (e) => !(e.followerId === me.uid && e.followingId === target.uid)
              )
            : [...prev.followingEdges, { followerId: me.uid, followingId: target.uid }];
          const delta = currentlyFollowing ? -1 : 1;
          return {
            ...prev,
            followingEdges: edges,
            users: {
              ...prev.users,
              [me.uid]: {
                ...me,
                followingCount: Math.max(0, me.followingCount + delta),
                updatedAt: now,
              },
              [target.uid]: {
                ...target,
                followersCount: Math.max(0, target.followersCount + delta),
                updatedAt: now,
              },
            },
          };
        });
      },
      fetchFollowConnections: async (userId) => {
        return {
          followers: protoState.followingEdges
            .filter((e) => e.followingId === userId)
            .map((e) => e.followerId),
          following: protoState.followingEdges
            .filter((e) => e.followerId === userId)
            .map((e) => e.followingId),
        };
      },
      updateProfile: async (updates) => {
        const now = Timestamp.now();
        updateProto((prev) => {
          const me = prev.users[prev.currentUserId];
          const cleanName = sanitizeString(updates.fullName, BLUEPRINT_LIMITS.fullNameMax);
          const cleanUser = sanitizeString(updates.username, BLUEPRINT_LIMITS.usernameMax);
          const taken = Object.values(prev.users).some(
            (u) => u.uid !== me.uid && u.usernameLower === cleanUser.toLowerCase()
          );
          if (taken) {
            throw new Error('That username is already taken.');
          }
          return {
            ...prev,
            users: {
              ...prev.users,
              [me.uid]: {
                ...me,
                fullName: cleanName,
                fullNameLower: cleanName.toLowerCase(),
                username: cleanUser,
                usernameLower: cleanUser.toLowerCase(),
                bio: sanitizeString(updates.bio, BLUEPRINT_LIMITS.bioMax),
                location: sanitizeString(updates.location, BLUEPRINT_LIMITS.locationMax),
                avatarUrl: updates.avatarUrl,
                coverUrl: updates.coverUrl,
                updatedAt: now,
              },
            },
          };
        });
      },
      uploadImage: async (file) => {
        const err = validateImageFile(file);
        if (err) throw new Error(err);
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Failed to read image file.'));
          reader.readAsDataURL(file);
        });
      },
      markNotificationRead: async (notificationId) => {
        updateProto((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          ),
        }));
      },
      markAllNotificationsRead: async (notificationIds) => {
        const setIds = new Set(notificationIds);
        updateProto((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) =>
            setIds.has(n.id) ? { ...n, read: true } : n
          ),
        }));
      },
      sendMessage: async (recipient, content) => {
        const cleanContent = sanitizeString(content, BLUEPRINT_LIMITS.messageContentMax);
        if (!cleanContent) throw new Error('Message cannot be empty.');
        const now = Timestamp.now();
        updateProto((prev) => {
          const me = prev.users[prev.currentUserId];
          const participantIds = [me.uid, recipient.uid].sort();
          const conversationId = getConversationId(me.uid, recipient.uid);
          const exists = prev.conversations.some((c) => c.id === conversationId);
          const preview = sanitizeString(cleanContent, BLUEPRINT_LIMITS.conversationLastMessageMax);

          const conversationsNext = exists
            ? prev.conversations.map((c) =>
                c.id === conversationId
                  ? {
                      ...c,
                      lastMessage: preview,
                      lastSenderId: me.uid,
                      lastMessageAt: now,
                      updatedAt: now,
                    }
                  : c
              )
            : [
                {
                  id: conversationId,
                  participantIds,
                  lastMessage: preview,
                  lastSenderId: me.uid,
                  lastMessageAt: now,
                  createdAt: now,
                  updatedAt: now,
                },
                ...prev.conversations,
              ];

          const newMessage: MessageItem = {
            id: `proto_msg_${Date.now()}`,
            conversationId,
            senderId: me.uid,
            receiverId: recipient.uid,
            participantIds,
            content: cleanContent,
            read: false,
            createdAt: now,
          };

          return {
            ...prev,
            conversations: conversationsNext,
            messages: [...prev.messages, newMessage],
          };
        });
      },
      markMessagesRead: async (messageIds) => {
        const setIds = new Set(messageIds);
        updateProto((prev) => ({
          ...prev,
          messages: prev.messages.map((m) => (setIds.has(m.id) ? { ...m, read: true } : m)),
        }));
      },
      showToast,
      openLightbox,
      resetPrototype: () => {
        setProtoState(resetPrototypeState());
        showToast('Prototype workspace reset', 'success');
      },
    };
  }, [
    activeUser,
    isPrototypeMode,
    openLightbox,
    protoState.comments,
    protoState.followingEdges,
    protoState.storyViews,
    showToast,
    updateProto,
  ]);

  const feedPosts = useMemo(() => {
    if (!activeUser) return [];
    if (feedMode === 'all') return posts;
    return posts.filter(
      (p) => p.authorId === activeUser.uid || followingIds.has(p.authorId)
    );
  }, [activeUser, feedMode, followingIds, posts]);

  const visibleFeedPosts = useMemo(
    () => feedPosts.slice(0, visibleFeedCount),
    [feedPosts, visibleFeedCount]
  );

  const hasMoreFeedPosts = visibleFeedCount < feedPosts.length;

  // Reset pagination when switching feed filter
  useEffect(() => {
    setVisibleFeedCount(FEED_PAGE_SIZE);
  }, [feedMode]);

  // Infinite scroll IntersectionObserver
  useEffect(() => {
    if (activeTab !== 'feed' || !hasMoreFeedPosts) return;
    const node = loadMoreRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleFeedCount((count) => Math.min(feedPosts.length, count + FEED_PAGE_SIZE));
        }
      },
      { rootMargin: '160px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [activeTab, feedPosts.length, hasMoreFeedPosts]);

  const bookmarkedPosts = useMemo(
    () => posts.filter((p) => bookmarkedPostIds.has(p.id)),
    [bookmarkedPostIds, posts]
  );

  const suggestedUsers = useMemo(() => {
    if (!activeUser) return [];
    return allUsers
      .filter((u) => u.uid !== activeUser.uid && !followingIds.has(u.uid))
      .sort((a, b) => b.followersCount - a.followersCount)
      .slice(0, 4);
  }, [activeUser, allUsers, followingIds]);

  const trendingHashtags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) {
      const unique = new Set<string>(p.hashtags || []);
      for (const tag of unique) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, 6);
  }, [posts]);

  const topTrendingPosts = useMemo(() => {
    return [...posts]
      .sort((a, b) => b.likesCount * 2 + b.commentsCount - (a.likesCount * 2 + a.commentsCount))
      .slice(0, 3);
  }, [posts]);

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const unreadMessagesCount = useMemo(() => {
    if (!activeUser) return 0;
    return messages.filter((m) => m.receiverId === activeUser.uid && !m.read).length;
  }, [activeUser, messages]);

  const activePostDetail = useMemo(
    () => posts.find((p) => p.id === selectedPostId) || null,
    [posts, selectedPostId]
  );

  if (
    !isPrototypeMode &&
    (authLoading || (firebaseUser && profileLoading && !userProfile && !needsProfileSetup))
  ) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-display font-bold text-zinc-900 dark:text-zinc-100">
            ConnectSphere
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (
    !isPrototypeMode &&
    (!firebaseUser || !isEmailVerified || !userProfile || needsProfileSetup)
  ) {
    return <AuthScreen />;
  }

  if (!activeUser) return null;

  const openProfile = (uid: string) => {
    setViewedProfileId(uid);
    setActiveTab('profile');
  };

  const openOwnProfile = () => {
    setViewedProfileId(activeUser.uid);
    setActiveTab('profile');
  };

  const handleSelectHashtag = (tag: string) => {
    setQuickSearch(`#${tag}`);
    setActiveTab('discover');
  };

  const handleOpenAuthorStories = (authorId: string) => {
    const idx = activeStories.findIndex((s) => s.authorId === authorId);
    if (idx >= 0) {
      setStoryViewerStartIndex(idx);
    }
  };

  const activeProfile = (viewedProfileId && usersMap[viewedProfileId]) || activeUser;

  const pageTitle =
    activeTab === 'feed'
      ? 'Home Feed'
      : activeTab === 'discover'
      ? 'Discover'
      : activeTab === 'bookmarks'
      ? 'Bookmarks'
      : activeTab === 'notifications'
      ? 'Notifications'
      : activeTab === 'messages'
      ? 'Messages'
      : activeProfile.uid === activeUser.uid
      ? 'Your Profile'
      : activeProfile.fullName;

  return (
    <SocialActionsProvider value={socialActions}>
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex justify-center">
        <div className="w-full max-w-[1360px] flex">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onOpenOwnProfile={openOwnProfile}
            currentUser={activeUser}
            unreadNotifications={unreadNotificationsCount}
            unreadMessages={unreadMessagesCount}
            bookmarksCount={bookmarkedPosts.length}
            isPrototypeMode={isPrototypeMode}
            onResetPrototype={socialActions.resetPrototype}
            onLogout={() => void logout()}
          />

          <main className="flex-1 min-w-0 max-w-2xl border-r border-zinc-200 dark:border-zinc-800 pb-16 md:pb-0">
            <header className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xs border-b border-zinc-200 dark:border-zinc-800 px-5 h-14 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="text-base font-display font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {pageTitle}
                </h1>
              </div>

              {activeTab === 'feed' && (
                <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg shrink-0">
                  <button
                    type="button"
                    onClick={() => setFeedMode('all')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      feedMode === 'all'
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    All posts
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedMode('following')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      feedMode === 'following'
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    Following
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1 md:hidden">
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                  className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => void logout()}
                  aria-label={isPrototypeMode ? 'Exit prototype' : 'Sign out'}
                  className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </header>

            {activeTab === 'feed' && (
              <>
                <StoriesBar
                  currentUser={activeUser}
                  usersMap={usersMap}
                  stories={activeStories}
                  viewedStoryIds={viewedStoryIds}
                  onOpenAuthorStories={handleOpenAuthorStories}
                />
                <PostComposer currentUser={activeUser} />
                {!isPrototypeMode && fbDataLoading ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 bg-zinc-100 dark:bg-zinc-900 rounded w-1/3" />
                          <div className="h-3 bg-zinc-100 dark:bg-zinc-900 rounded w-5/6" />
                          <div className="h-3 bg-zinc-100 dark:bg-zinc-900 rounded w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : feedPosts.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {feedMode === 'following'
                        ? 'No posts from people you follow yet'
                        : 'No posts yet'}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-4">
                      {feedMode === 'following'
                        ? 'Follow members in Discover or switch to All posts to explore the community.'
                        : 'Publish the first post above to start the conversation.'}
                    </p>
                    {feedMode === 'following' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('discover')}
                        className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200"
                      >
                        Explore Discover
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {visibleFeedPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        author={usersMap[post.authorId]}
                        currentUser={activeUser}
                        isLiked={likedPostIds.has(post.id)}
                        isBookmarked={bookmarkedPostIds.has(post.id)}
                        onOpenProfile={openProfile}
                        onOpenPostDetail={(p) => setSelectedPostId(p.id)}
                        onSelectHashtag={handleSelectHashtag}
                      />
                    ))}

                    {hasMoreFeedPosts ? (
                      <div
                        ref={loadMoreRef}
                        className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-center"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setVisibleFeedCount((c) => Math.min(feedPosts.length, c + FEED_PAGE_SIZE))
                          }
                          className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                        >
                          Load more posts ({feedPosts.length - visibleFeedCount} remaining)
                        </button>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                        You have reached the end of the feed.
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {activeTab === 'discover' && (
              <DiscoverView
                currentUser={activeUser}
                allUsers={allUsers}
                usersMap={usersMap}
                posts={posts}
                likedPostIds={likedPostIds}
                bookmarkedPostIds={bookmarkedPostIds}
                followingIds={followingIds}
                initialQuery={quickSearch}
                onOpenProfile={openProfile}
                onOpenPostDetail={(p) => setSelectedPostId(p.id)}
                onSelectHashtag={handleSelectHashtag}
              />
            )}

            {activeTab === 'bookmarks' && (
              <div>
                <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Saved posts ({bookmarkedPosts.length})
                  </span>
                </div>
                {bookmarkedPosts.length === 0 ? (
                  <div className="p-12 text-center">
                    <Bookmark className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      No saved posts yet
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-4">
                      Bookmark any post from the Home Feed or Discover to read it again later.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('feed')}
                      className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200"
                    >
                      Browse Home Feed
                    </button>
                  </div>
                ) : (
                  bookmarkedPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      author={usersMap[post.authorId]}
                      currentUser={activeUser}
                      isLiked={likedPostIds.has(post.id)}
                      isBookmarked={true}
                      onOpenProfile={openProfile}
                      onOpenPostDetail={(p) => setSelectedPostId(p.id)}
                      onSelectHashtag={handleSelectHashtag}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'notifications' && (
              <NotificationsView
                notifications={notifications}
                onOpenProfile={openProfile}
                onOpenPostById={(postId) => setSelectedPostId(postId)}
                onOpenMessagesWithUser={(uid) => {
                  setSelectedRecipientId(uid);
                  setActiveTab('messages');
                }}
              />
            )}

            {activeTab === 'messages' && (
              <MessagesView
                currentUser={activeUser}
                allUsers={allUsers}
                usersMap={usersMap}
                conversations={conversations}
                messages={messages}
                selectedRecipientId={selectedRecipientId}
                onSelectRecipientId={setSelectedRecipientId}
                onOpenProfile={openProfile}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                profile={activeProfile}
                currentUser={activeUser}
                usersMap={usersMap}
                posts={posts}
                likedPostIds={likedPostIds}
                bookmarkedPostIds={bookmarkedPostIds}
                followingIds={followingIds}
                onOpenProfile={openProfile}
                onOpenPostDetail={(p) => setSelectedPostId(p.id)}
                onStartMessage={(target) => {
                  setSelectedRecipientId(target.uid);
                  setActiveTab('messages');
                }}
                onSelectHashtag={handleSelectHashtag}
              />
            )}
          </main>

          <aside className="hidden xl:block w-80 shrink-0 px-6 py-5 space-y-6 sticky top-0 h-screen overflow-y-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setActiveTab('discover');
              }}
              className="relative"
            >
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Search posts, users, #tags..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-zinc-900 dark:focus:border-zinc-400"
              />
            </form>

            <section className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-zinc-950">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-display font-bold text-zinc-900 dark:text-zinc-100">
                  Who to follow
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('discover')}
                  className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  See all
                </button>
              </div>
              {suggestedUsers.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 py-2">
                  You are following all current members.
                </p>
              ) : (
                <div className="space-y-3">
                  {suggestedUsers.map((person) => (
                    <div key={person.uid} className="flex items-center justify-between gap-2.5">
                      <button
                        type="button"
                        onClick={() => openProfile(person.uid)}
                        className="flex items-center gap-2.5 min-w-0 text-left group"
                      >
                        <Avatar src={person.avatarUrl} name={person.fullName} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:underline">
                            {person.fullName}
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            @{person.username}
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => void socialActions.toggleFollow(person, false)}
                        className="px-3 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 whitespace-nowrap shrink-0"
                      >
                        Follow
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {trendingHashtags.length > 0 && (
              <section className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-zinc-950">
                <h2 className="text-sm font-display font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                  Trending topics
                </h2>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {trendingHashtags.map(({ tag, count }) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleSelectHashtag(tag)}
                      className="w-full py-2 first:pt-0 last:pb-0 flex items-center justify-between text-left group"
                    >
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:underline">
                        <Hash className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{tag}</span>
                      </span>
                      <span className="font-mono-num text-[11px] text-zinc-400">
                        {count} {count === 1 ? 'post' : 'posts'}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-zinc-950">
              <h2 className="text-sm font-display font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                Popular discussions
              </h2>
              {topTrendingPosts.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 py-2">No public posts yet.</p>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {topTrendingPosts.map((post) => {
                    const author = usersMap[post.authorId];
                    return (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => setSelectedPostId(post.id)}
                        className="w-full text-left py-2.5 first:pt-0 last:pb-0 hover:opacity-80 transition-opacity"
                      >
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {author?.fullName || post.authorName}
                        </p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-0.5">
                          {post.content || 'Shared a photo'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 font-mono-num text-[11px] text-zinc-400">
                          <span>{post.likesCount} likes</span>
                          <span aria-hidden="true">&middot;</span>
                          <span>{post.commentsCount} comments</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </aside>
        </div>

        {activePostDetail && (
          <PostDetailModal
            post={activePostDetail}
            usersMap={usersMap}
            currentUser={activeUser}
            isLiked={likedPostIds.has(activePostDetail.id)}
            isBookmarked={bookmarkedPostIds.has(activePostDetail.id)}
            onClose={() => setSelectedPostId(null)}
            onOpenProfile={openProfile}
            onSelectHashtag={handleSelectHashtag}
          />
        )}

        {storyViewerStartIndex !== null && activeStories.length > 0 && (
          <StoryViewerModal
            stories={activeStories}
            initialIndex={storyViewerStartIndex}
            currentUser={activeUser}
            usersMap={usersMap}
            onClose={() => setStoryViewerStartIndex(null)}
            onOpenProfile={openProfile}
          />
        )}

        {lightboxImage && (
          <ImageLightbox
            imageUrl={lightboxImage.url}
            alt={lightboxImage.alt}
            onClose={() => setLightboxImage(null)}
          />
        )}

        <ToastContainer
          toasts={toasts}
          onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        />
      </div>
    </SocialActionsProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ConnectSphereWorkspace />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
