import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Camera,
  Heart,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  MessageCircle,
  MessageSquare,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { useSocialActions } from '../contexts/SocialActionsContext';
import { formatFullDate, validateFullName, validateUsername } from '../lib/validation';
import { CURATED_COVER_PRESETS } from '../services/demoSeed';
import { BLUEPRINT_LIMITS, type Post, type UserPublic } from '../types/social';
import { Avatar } from './Avatar';
import { PostCard } from './PostCard';

interface ProfileViewProps {
  profile: UserPublic;
  currentUser: UserPublic;
  usersMap: Record<string, UserPublic>;
  posts: Post[];
  likedPostIds: Set<string>;
  bookmarkedPostIds: Set<string>;
  followingIds: Set<string>;
  onOpenProfile: (uid: string) => void;
  onOpenPostDetail: (post: Post) => void;
  onStartMessage: (targetUser: UserPublic) => void;
  onSelectHashtag: (tag: string) => void;
}

export function ProfileView({
  profile,
  currentUser,
  usersMap,
  posts,
  likedPostIds,
  bookmarkedPostIds,
  followingIds,
  onOpenProfile,
  onOpenPostDetail,
  onStartMessage,
  onSelectHashtag,
}: ProfileViewProps) {
  const actions = useSocialActions();
  const isOwnProfile = profile.uid === currentUser.uid && !profile.isDemo;
  const isFollowing = followingIds.has(profile.uid);

  const [postsLayout, setPostsLayout] = useState<'grid' | 'list'>('grid');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  const [connectionsModal, setConnectionsModal] = useState<'followers' | 'following' | null>(null);
  const [connectionUids, setConnectionUids] = useState<string[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  const [fullName, setFullName] = useState(profile.fullName);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [location, setLocation] = useState(profile.location);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [coverUrl, setCoverUrl] = useState(profile.coverUrl);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFullName(profile.fullName);
    setUsername(profile.username);
    setBio(profile.bio);
    setLocation(profile.location);
    setAvatarUrl(profile.avatarUrl);
    setCoverUrl(profile.coverUrl);
  }, [profile]);

  const userPosts = posts.filter((p) => p.authorId === profile.uid);

  const handleToggleFollow = async () => {
    if (isOwnProfile || followPending) return;
    setFollowPending(true);
    try {
      await actions.toggleFollow(profile, isFollowing);
    } finally {
      setFollowPending(false);
    }
  };

  const openConnections = async (type: 'followers' | 'following') => {
    setConnectionsModal(type);
    setLoadingConnections(true);
    try {
      const data = await actions.fetchFollowConnections(profile.uid);
      setConnectionUids(type === 'followers' ? data.followers : data.following);
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditError(null);
    setUploadingAvatar(true);
    try {
      const url = await actions.uploadImage(file, 'avatars');
      setAvatarUrl(url);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to upload avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditError(null);
    setUploadingCover(true);
    try {
      const url = await actions.uploadImage(file, 'covers');
      setCoverUrl(url);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to upload cover image.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    const nameErr = validateFullName(fullName);
    if (nameErr) {
      setEditError(nameErr);
      return;
    }
    const userErr = validateUsername(username);
    if (userErr) {
      setEditError(userErr);
      return;
    }

    setSavingProfile(true);
    try {
      await actions.updateProfile({
        fullName,
        username,
        bio,
        location,
        avatarUrl,
        coverUrl,
      });
      setEditModalOpen(false);
      actions.showToast('Profile saved', 'success');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div>
      {/* Cover Image Banner */}
      <div className="h-44 sm:h-52 bg-zinc-900 relative overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
        {profile.coverUrl ? (
          <img
            src={profile.coverUrl}
            alt={`${profile.fullName} cover`}
            referrerPolicy="no-referrer"
            onClick={() => actions.openLightbox(profile.coverUrl, `${profile.fullName} cover`)}
            className="w-full h-full object-cover cursor-zoom-in"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 dark:bg-zinc-900" />
        )}
      </div>

      {/* Profile Header Details */}
      <div className="px-5 pb-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="flex items-end justify-between gap-4 -mt-12 mb-4">
          <div className="rounded-full ring-4 ring-white dark:ring-zinc-950 bg-white dark:bg-zinc-950">
            <Avatar src={profile.avatarUrl} name={profile.fullName} size="xl" />
          </div>

          <div className="flex items-center gap-2 pt-14">
            {isOwnProfile ? (
              <button
                type="button"
                onClick={() => setEditModalOpen(true)}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-semibold rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors whitespace-nowrap shrink-0"
              >
                Edit profile
              </button>
            ) : profile.uid !== currentUser.uid ? (
              <>
                <button
                  type="button"
                  onClick={() => onStartMessage(profile)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-semibold rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors whitespace-nowrap shrink-0"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Message</span>
                </button>
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  disabled={followPending}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    isFollowing
                      ? 'border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div>
          <h1 className="text-xl font-display font-bold text-zinc-900 dark:text-zinc-100">
            {profile.fullName}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 text-sm text-zinc-500 dark:text-zinc-400">
            <span>@{profile.username}</span>
            {profile.isDemo && (
              <>
                <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">
                  &middot;
                </span>
                <span className="text-xs">Demo account</span>
              </>
            )}
          </div>

          {profile.bio && (
            <p className="mt-3 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap max-w-xl">
              {profile.bio}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            {profile.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{profile.location}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Joined {formatFullDate(profile.joinedAt) || 'Recently'}</span>
            </span>
          </div>

          <div className="flex items-center gap-5 mt-4 text-xs">
            <div>
              <span className="font-mono-num font-bold text-zinc-900 dark:text-zinc-100">
                {profile.postsCount}
              </span>{' '}
              <span className="text-zinc-500 dark:text-zinc-400">Posts</span>
            </div>
            <button
              type="button"
              onClick={() => void openConnections('followers')}
              className="hover:underline text-left"
            >
              <span className="font-mono-num font-bold text-zinc-900 dark:text-zinc-100">
                {profile.followersCount}
              </span>{' '}
              <span className="text-zinc-500 dark:text-zinc-400">Followers</span>
            </button>
            <button
              type="button"
              onClick={() => void openConnections('following')}
              className="hover:underline text-left"
            >
              <span className="font-mono-num font-bold text-zinc-900 dark:text-zinc-100">
                {profile.followingCount}
              </span>{' '}
              <span className="text-zinc-500 dark:text-zinc-400">Following</span>
            </button>
          </div>
        </div>
      </div>

      {/* User's Posts Header + Grid/List Toggle */}
      <div>
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            Posts ({userPosts.length})
          </h2>
          <div className="flex items-center gap-1 p-0.5 bg-zinc-200/70 dark:bg-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => setPostsLayout('grid')}
              aria-label="Grid view"
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                postsLayout === 'grid'
                  ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setPostsLayout('list')}
              aria-label="List view"
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                postsLayout === 'list'
                  ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>

        {userPosts.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {isOwnProfile
              ? 'You have not published any posts yet.'
              : `${profile.fullName} has not published any posts yet.`}
          </div>
        ) : postsLayout === 'grid' ? (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white dark:bg-zinc-950">
            {userPosts.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => onOpenPostDetail(post)}
                className="group relative aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-left"
              >
                {post.imageUrl ? (
                  <img
                    src={post.imageUrl}
                    alt={`Post by ${profile.fullName}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full p-3.5 flex flex-col justify-between bg-zinc-50 dark:bg-zinc-900">
                    <p className="text-xs text-zinc-800 dark:text-zinc-200 line-clamp-5 leading-relaxed">
                      {post.content}
                    </p>
                    <span className="text-[11px] font-mono-num text-zinc-400">
                      {post.hashtags?.[0] ? `#${post.hashtags[0]}` : 'Post'}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-zinc-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 text-white">
                  <div className="flex items-center gap-3 text-xs font-mono-num font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 fill-white" />
                      {post.likesCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 fill-white" />
                      {post.commentsCount}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          userPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              author={usersMap[post.authorId]}
              currentUser={currentUser}
              isLiked={likedPostIds.has(post.id)}
              isBookmarked={bookmarkedPostIds.has(post.id)}
              onOpenProfile={onOpenProfile}
              onOpenPostDetail={onOpenPostDetail}
              onSelectHashtag={onSelectHashtag}
            />
          ))
        )}
      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && isOwnProfile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit profile"
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setEditModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-base font-display font-bold text-zinc-900 dark:text-zinc-100">
                Edit profile
              </h2>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                aria-label="Close edit profile modal"
                className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-5 space-y-4">
              {editError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Cover image
                </label>
                <div className="relative h-28 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-900">
                  {coverUrl && (
                    <img
                      src={coverUrl}
                      alt="Cover preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="absolute inset-0 bg-black/35 hover:bg-black/45 text-white flex items-center justify-center gap-2 text-xs font-medium transition-colors"
                  >
                    {uploadingCover ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    <span>{uploadingCover ? 'Uploading cover...' : 'Upload custom cover'}</span>
                  </button>
                </div>

                {/* Curated Cover Presets */}
                <div className="mt-2">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Or choose a studio banner:
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {CURATED_COVER_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setCoverUrl(preset.url)}
                        className={`relative h-12 rounded-lg overflow-hidden border text-left transition-all ${
                          coverUrl === preset.url
                            ? 'border-zinc-900 dark:border-zinc-100 ring-2 ring-zinc-900/20 dark:ring-zinc-100/20'
                            : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-black/55 text-[10px] text-white px-1.5 py-0.5 truncate">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Profile picture
                </label>
                <div className="flex items-center gap-4">
                  <Avatar src={avatarUrl} name={fullName || profile.fullName} size="lg" />
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="inline-flex items-center gap-2 px-3.5 py-2 border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                    <span>{uploadingAvatar ? 'Uploading...' : 'Upload new photo'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={BLUEPRINT_LIMITS.fullNameMax}
                    required
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    maxLength={BLUEPRINT_LIMITS.usernameMax}
                    required
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={BLUEPRINT_LIMITS.bioMax}
                  placeholder="Tell people about your work and interests..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                />
                <p className="text-[11px] text-zinc-400 text-right font-mono-num mt-1">
                  {bio.length}/{BLUEPRINT_LIMITS.bioMax}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={BLUEPRINT_LIMITS.locationMax}
                  placeholder="San Francisco, CA"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile || uploadingAvatar || uploadingCover}
                  className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Followers / Following Modal */}
      {connectionsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={connectionsModal === 'followers' ? 'Followers' : 'Following'}
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setConnectionsModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[80vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-base font-display font-bold text-zinc-900 dark:text-zinc-100 capitalize">
                {connectionsModal}
              </h2>
              <button
                type="button"
                onClick={() => setConnectionsModal(null)}
                className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
              {loadingConnections ? (
                <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  Loading users...
                </div>
              ) : connectionUids.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  {connectionsModal === 'followers'
                    ? 'No followers yet.'
                    : 'Not following anyone yet.'}
                </div>
              ) : (
                connectionUids.map((uid) => {
                  const u = usersMap[uid];
                  if (!u) return null;
                  const alreadyFollowing = followingIds.has(u.uid);
                  const isSelf = u.uid === currentUser.uid;
                  return (
                    <div key={uid} className="px-5 py-3.5 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setConnectionsModal(null);
                          onOpenProfile(u.uid);
                        }}
                        className="flex items-center gap-3 min-w-0 text-left group"
                      >
                        <Avatar src={u.avatarUrl} name={u.fullName} size="md" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:underline">
                            {u.fullName}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            @{u.username}
                          </p>
                        </div>
                      </button>

                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => void actions.toggleFollow(u, alreadyFollowing)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                            alreadyFollowing
                              ? 'border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                              : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                          }`}
                        >
                          {alreadyFollowing ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
