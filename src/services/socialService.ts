import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { extractHashtags, sanitizeString } from '../lib/validation';
import {
  BLUEPRINT_LIMITS,
  type Post,
  type Story,
  type StoryView,
  type UserPublic,
} from '../types/social';

export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const usernameLower = username.trim().toLowerCase();
  const path = `usernames/${usernameLower}`;
  try {
    const snap = await getDoc(doc(db, 'usernames', usernameLower));
    return !snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createUserProfile(params: {
  uid: string;
  email: string;
  fullName: string;
  username: string;
  avatarUrl?: string;
}): Promise<UserPublic> {
  const uid = params.uid;
  const cleanFullName = sanitizeString(params.fullName, BLUEPRINT_LIMITS.fullNameMax);
  const cleanUsername = sanitizeString(params.username, BLUEPRINT_LIMITS.usernameMax);
  const usernameLower = cleanUsername.toLowerCase();
  const fullNameLower = cleanFullName.toLowerCase();
  const avatarUrl = sanitizeString(params.avatarUrl || '', BLUEPRINT_LIMITS.urlMax);
  const email = sanitizeString(params.email, BLUEPRINT_LIMITS.emailMax);

  const userRef = doc(db, 'users', uid);
  const privateRef = doc(db, 'users', uid, 'private', 'account');
  const usernameRef = doc(db, 'usernames', usernameLower);

  try {
    await runTransaction(db, async (tx) => {
      const existingUser = await tx.get(userRef);
      if (existingUser.exists()) {
        return;
      }
      const existingUsername = await tx.get(usernameRef);
      if (existingUsername.exists()) {
        throw new Error('USERNAME_TAKEN');
      }

      tx.set(usernameRef, {
        uid,
        username: cleanUsername,
        createdAt: serverTimestamp(),
      });

      tx.set(userRef, {
        uid,
        username: cleanUsername,
        usernameLower,
        fullName: cleanFullName,
        fullNameLower,
        bio: '',
        location: '',
        avatarUrl,
        coverUrl: '',
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        isPublic: true,
        isDemo: false,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      tx.set(privateRef, {
        uid,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    const created = await getDoc(userRef);
    return created.data() as UserPublic;
  } catch (error) {
    if (error instanceof Error && error.message === 'USERNAME_TAKEN') {
      throw new Error('That username is already taken. Please choose another.');
    }
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export async function updateUserProfile(
  currentProfile: UserPublic,
  updates: {
    fullName: string;
    username: string;
    bio: string;
    location: string;
    avatarUrl: string;
    coverUrl: string;
  }
): Promise<void> {
  const uid = currentProfile.uid;
  const cleanFullName = sanitizeString(updates.fullName, BLUEPRINT_LIMITS.fullNameMax);
  const cleanUsername = sanitizeString(updates.username, BLUEPRINT_LIMITS.usernameMax);
  const newUsernameLower = cleanUsername.toLowerCase();
  const oldUsernameLower = currentProfile.usernameLower;

  const userRef = doc(db, 'users', uid);

  try {
    await runTransaction(db, async (tx) => {
      if (newUsernameLower !== oldUsernameLower) {
        const newClaimRef = doc(db, 'usernames', newUsernameLower);
        const newClaimSnap = await tx.get(newClaimRef);
        if (newClaimSnap.exists() && newClaimSnap.data()?.uid !== uid) {
          throw new Error('USERNAME_TAKEN');
        }
        const oldClaimRef = doc(db, 'usernames', oldUsernameLower);
        tx.delete(oldClaimRef);
        tx.set(newClaimRef, {
          uid,
          username: cleanUsername,
          createdAt: serverTimestamp(),
        });
      }

      tx.update(userRef, {
        fullName: cleanFullName,
        fullNameLower: cleanFullName.toLowerCase(),
        username: cleanUsername,
        usernameLower: newUsernameLower,
        bio: sanitizeString(updates.bio, BLUEPRINT_LIMITS.bioMax),
        location: sanitizeString(updates.location, BLUEPRINT_LIMITS.locationMax),
        avatarUrl: sanitizeString(updates.avatarUrl, BLUEPRINT_LIMITS.urlMax),
        coverUrl: sanitizeString(updates.coverUrl, BLUEPRINT_LIMITS.urlMax),
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'USERNAME_TAKEN') {
      throw new Error('That username is already taken. Please choose another.');
    }
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function createPost(
  author: UserPublic,
  content: string,
  imageUrl: string
): Promise<string> {
  const cleanContent = sanitizeString(content, BLUEPRINT_LIMITS.postContentMax);
  const cleanImageUrl = sanitizeString(imageUrl, BLUEPRINT_LIMITS.urlMax);

  if (!cleanContent && !cleanImageUrl) {
    throw new Error('Please write something or attach an image before posting.');
  }

  const hashtags = extractHashtags(cleanContent);
  const postRef = doc(collection(db, 'posts'));
  const userRef = doc(db, 'users', author.uid);
  const batch = writeBatch(db);

  batch.set(postRef, {
    id: postRef.id,
    authorId: author.uid,
    authorUsername: author.username,
    authorName: author.fullName,
    authorAvatarUrl: author.avatarUrl,
    content: cleanContent,
    imageUrl: cleanImageUrl,
    hashtags,
    visibility: 'public',
    isDemo: false,
    likesCount: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.update(userRef, {
    postsCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return postRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `posts/${postRef.id}`);
  }
}

export async function updatePost(
  postId: string,
  content: string,
  imageUrl: string
): Promise<void> {
  const cleanContent = sanitizeString(content, BLUEPRINT_LIMITS.postContentMax);
  const cleanImageUrl = sanitizeString(imageUrl, BLUEPRINT_LIMITS.urlMax);

  if (!cleanContent && !cleanImageUrl) {
    throw new Error('Post cannot be empty.');
  }

  const hashtags = extractHashtags(cleanContent);

  try {
    await updateDoc(doc(db, 'posts', postId), {
      content: cleanContent,
      imageUrl: cleanImageUrl,
      hashtags,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
  }
}

export async function deletePost(postId: string, authorId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'posts', postId));
  batch.update(doc(db, 'users', authorId), {
    postsCount: increment(-1),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
  }
}

export async function togglePostLike(
  post: Post,
  currentUser: UserPublic,
  currentlyLiked: boolean
): Promise<void> {
  const likeId = `${post.id}_${currentUser.uid}`;
  const likeRef = doc(db, 'likes', likeId);
  const postRef = doc(db, 'posts', post.id);
  const batch = writeBatch(db);

  if (currentlyLiked) {
    batch.delete(likeRef);
    batch.update(postRef, {
      likesCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.set(likeRef, {
      postId: post.id,
      userId: currentUser.uid,
      postAuthorId: post.authorId,
      createdAt: serverTimestamp(),
    });
    batch.update(postRef, {
      likesCount: increment(1),
      updatedAt: serverTimestamp(),
    });

    if (post.authorId !== currentUser.uid && !post.isDemo) {
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        id: notifRef.id,
        recipientId: post.authorId,
        actorId: currentUser.uid,
        actorUsername: currentUser.username,
        actorName: currentUser.fullName,
        actorAvatarUrl: currentUser.avatarUrl,
        type: 'like',
        postId: post.id,
        message: sanitizeString(
          `${currentUser.fullName} liked your post.`,
          BLUEPRINT_LIMITS.notificationMessageMax
        ),
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `likes/${likeId}`);
  }
}

export async function togglePostBookmark(
  post: Post,
  currentUser: UserPublic,
  currentlyBookmarked: boolean
): Promise<void> {
  const bookmarkId = `${currentUser.uid}_${post.id}`;
  const bookmarkRef = doc(db, 'bookmarks', bookmarkId);
  const batch = writeBatch(db);

  if (currentlyBookmarked) {
    batch.delete(bookmarkRef);
  } else {
    batch.set(bookmarkRef, {
      userId: currentUser.uid,
      postId: post.id,
      postAuthorId: post.authorId,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `bookmarks/${bookmarkId}`);
  }
}

export async function createStory(
  author: UserPublic,
  mediaUrl: string,
  caption: string
): Promise<string> {
  const cleanMedia = sanitizeString(mediaUrl, BLUEPRINT_LIMITS.urlMax);
  const cleanCaption = sanitizeString(caption, BLUEPRINT_LIMITS.storyCaptionMax);
  if (!cleanMedia) {
    throw new Error('Please upload an image for your story.');
  }

  const storyRef = doc(collection(db, 'stories'));
  const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);
  const batch = writeBatch(db);

  batch.set(storyRef, {
    id: storyRef.id,
    authorId: author.uid,
    authorUsername: author.username,
    authorName: author.fullName,
    authorAvatarUrl: author.avatarUrl,
    mediaUrl: cleanMedia,
    caption: cleanCaption,
    isPublic: true,
    isDemo: false,
    viewsCount: 0,
    createdAt: serverTimestamp(),
    expiresAt,
  });

  try {
    await batch.commit();
    return storyRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `stories/${storyRef.id}`);
  }
}

export async function deleteStory(storyId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'stories', storyId));
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `stories/${storyId}`);
  }
}

export async function recordStoryView(story: Story, viewer: UserPublic): Promise<void> {
  if (story.authorId === viewer.uid) return;
  const viewRef = doc(db, 'stories', story.id, 'views', viewer.uid);
  const storyRef = doc(db, 'stories', story.id);

  try {
    const existing = await getDoc(viewRef);
    if (existing.exists()) return;

    const batch = writeBatch(db);
    batch.set(viewRef, {
      viewerId: viewer.uid,
      viewerUsername: viewer.username,
      viewerName: viewer.fullName,
      viewerAvatarUrl: viewer.avatarUrl,
      viewedAt: serverTimestamp(),
    });
    batch.update(storyRef, {
      viewsCount: increment(1),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stories/${story.id}/views/${viewer.uid}`);
  }
}

export async function fetchStoryViews(storyId: string): Promise<StoryView[]> {
  try {
    const snap = await getDocs(collection(db, 'stories', storyId, 'views'));
    const list = snap.docs.map((d) => d.data() as StoryView);
    list.sort((a, b) => (b.viewedAt?.toMillis() ?? 0) - (a.viewedAt?.toMillis() ?? 0));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `stories/${storyId}/views`);
  }
}

export async function addComment(
  post: Post,
  currentUser: UserPublic,
  content: string
): Promise<void> {
  const cleanContent = sanitizeString(content, BLUEPRINT_LIMITS.commentContentMax);
  if (!cleanContent) {
    throw new Error('Comment cannot be empty.');
  }

  const commentRef = doc(collection(db, 'comments'));
  const postRef = doc(db, 'posts', post.id);
  const batch = writeBatch(db);

  batch.set(commentRef, {
    id: commentRef.id,
    postId: post.id,
    postAuthorId: post.authorId,
    authorId: currentUser.uid,
    authorUsername: currentUser.username,
    authorName: currentUser.fullName,
    authorAvatarUrl: currentUser.avatarUrl,
    content: cleanContent,
    isPublic: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.update(postRef, {
    commentsCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  if (post.authorId !== currentUser.uid && !post.isDemo) {
    const notifRef = doc(collection(db, 'notifications'));
    batch.set(notifRef, {
      id: notifRef.id,
      recipientId: post.authorId,
      actorId: currentUser.uid,
      actorUsername: currentUser.username,
      actorName: currentUser.fullName,
      actorAvatarUrl: currentUser.avatarUrl,
      type: 'comment',
      postId: post.id,
      message: sanitizeString(
        `${currentUser.fullName} commented on your post.`,
        BLUEPRINT_LIMITS.notificationMessageMax
      ),
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `comments/${commentRef.id}`);
  }
}

export async function editComment(commentId: string, content: string): Promise<void> {
  const cleanContent = sanitizeString(content, BLUEPRINT_LIMITS.commentContentMax);
  if (!cleanContent) {
    throw new Error('Comment cannot be empty.');
  }

  try {
    await updateDoc(doc(db, 'comments', commentId), {
      content: cleanContent,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `comments/${commentId}`);
  }
}

export async function deleteComment(commentId: string, postId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'comments', commentId));
  batch.update(doc(db, 'posts', postId), {
    commentsCount: increment(-1),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `comments/${commentId}`);
  }
}

export async function toggleFollowUser(
  currentUser: UserPublic,
  targetUser: UserPublic,
  currentlyFollowing: boolean
): Promise<void> {
  if (currentUser.uid === targetUser.uid) {
    throw new Error('You cannot follow yourself.');
  }

  const followId = `${currentUser.uid}_${targetUser.uid}`;
  const followRef = doc(db, 'followers', followId);
  const currentUserRef = doc(db, 'users', currentUser.uid);
  const targetUserRef = doc(db, 'users', targetUser.uid);
  const batch = writeBatch(db);

  if (currentlyFollowing) {
    batch.delete(followRef);
    batch.update(currentUserRef, {
      followingCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
    batch.update(targetUserRef, {
      followersCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.set(followRef, {
      followerId: currentUser.uid,
      followingId: targetUser.uid,
      isPublic: true,
      createdAt: serverTimestamp(),
    });
    batch.update(currentUserRef, {
      followingCount: increment(1),
      updatedAt: serverTimestamp(),
    });
    batch.update(targetUserRef, {
      followersCount: increment(1),
      updatedAt: serverTimestamp(),
    });

    if (!targetUser.isDemo) {
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        id: notifRef.id,
        recipientId: targetUser.uid,
        actorId: currentUser.uid,
        actorUsername: currentUser.username,
        actorName: currentUser.fullName,
        actorAvatarUrl: currentUser.avatarUrl,
        type: 'follow',
        postId: '',
        message: sanitizeString(
          `${currentUser.fullName} started following you.`,
          BLUEPRINT_LIMITS.notificationMessageMax
        ),
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `followers/${followId}`);
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

export async function markAllNotificationsRead(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;
  const batch = writeBatch(db);
  for (const id of notificationIds) {
    batch.update(doc(db, 'notifications', id), {
      read: true,
      updatedAt: serverTimestamp(),
    });
  }
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'notifications');
  }
}

export function getConversationId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

export async function sendDirectMessage(
  currentUser: UserPublic,
  recipient: UserPublic,
  content: string
): Promise<string> {
  if (currentUser.uid === recipient.uid) {
    throw new Error('You cannot send a direct message to yourself.');
  }
  const cleanContent = sanitizeString(content, BLUEPRINT_LIMITS.messageContentMax);
  if (!cleanContent) {
    throw new Error('Message cannot be empty.');
  }

  const participantIds = [currentUser.uid, recipient.uid].sort();
  const conversationId = participantIds.join('_');
  const convRef = doc(db, 'conversations', conversationId);
  const msgRef = doc(collection(db, 'messages'));
  const notifRef = doc(collection(db, 'notifications'));

  try {
    const convSnap = await getDoc(convRef);
    const batch = writeBatch(db);
    const preview = sanitizeString(cleanContent, BLUEPRINT_LIMITS.conversationLastMessageMax);

    if (!convSnap.exists()) {
      batch.set(convRef, {
        id: conversationId,
        participantIds,
        lastMessage: preview,
        lastSenderId: currentUser.uid,
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(convRef, {
        lastMessage: preview,
        lastSenderId: currentUser.uid,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    batch.set(msgRef, {
      id: msgRef.id,
      conversationId,
      senderId: currentUser.uid,
      receiverId: recipient.uid,
      participantIds,
      content: cleanContent,
      read: false,
      createdAt: serverTimestamp(),
    });

    if (!recipient.isDemo) {
      batch.set(notifRef, {
        id: notifRef.id,
        recipientId: recipient.uid,
        actorId: currentUser.uid,
        actorUsername: currentUser.username,
        actorName: currentUser.fullName,
        actorAvatarUrl: currentUser.avatarUrl,
        type: 'message',
        postId: '',
        message: sanitizeString(
          `${currentUser.fullName} sent you a direct message.`,
          BLUEPRINT_LIMITS.notificationMessageMax
        ),
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return conversationId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `conversations/${conversationId}`);
  }
}

export async function markMessagesRead(messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return;
  const batch = writeBatch(db);
  for (const id of messageIds) {
    batch.update(doc(db, 'messages', id), { read: true });
  }
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'messages');
  }
}

export async function fetchFollowConnections(userId: string): Promise<{
  followers: string[];
  following: string[];
}> {
  try {
    const followersQuery = query(
      collection(db, 'followers'),
      where('followingId', '==', userId),
      where('isPublic', '==', true)
    );
    const followingQuery = query(
      collection(db, 'followers'),
      where('followerId', '==', userId),
      where('isPublic', '==', true)
    );
    const [followersSnap, followingSnap] = await Promise.all([
      getDocs(followersQuery),
      getDocs(followingQuery),
    ]);
    return {
      followers: followersSnap.docs.map((d) => d.data().followerId as string),
      following: followingSnap.docs.map((d) => d.data().followingId as string),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'followers');
  }
}
