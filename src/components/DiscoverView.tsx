import { useEffect, useMemo, useState } from 'react';
import {
  Hash,
  Heart,
  LayoutGrid,
  List,
  MessageCircle,
  Search,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { useSocialActions } from '../contexts/SocialActionsContext';
import type { Post, UserPublic } from '../types/social';
import { Avatar } from './Avatar';
import { PostCard } from './PostCard';

interface DiscoverViewProps {
  currentUser: UserPublic;
  allUsers: UserPublic[];
  usersMap: Record<string, UserPublic>;
  posts: Post[];
  likedPostIds: Set<string>;
  bookmarkedPostIds: Set<string>;
  followingIds: Set<string>;
  initialQuery?: string;
  onOpenProfile: (uid: string) => void;
  onOpenPostDetail: (post: Post) => void;
  onSelectHashtag: (tag: string) => void;
}

export function DiscoverView({
  currentUser,
  allUsers,
  usersMap,
  posts,
  likedPostIds,
  bookmarkedPostIds,
  followingIds,
  initialQuery = '',
  onOpenProfile,
  onOpenPostDetail,
  onSelectHashtag,
}: DiscoverViewProps) {
  const actions = useSocialActions();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeSubTab, setActiveSubTab] = useState<'grid' | 'trending' | 'people'>('grid');

  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const normalizedTagFilter = trimmedQuery.startsWith('#') ? trimmedQuery.slice(1) : '';

  // Compute trending hashtags strictly from real available posts
  const trendingHashtags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      const tags = new Set<string>(post.hashtags || []);
      for (const tag of tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, 10);
  }, [posts]);

  const matchingUsers = useMemo(() => {
    const others = allUsers.filter((u) => u.uid !== currentUser.uid);
    if (!trimmedQuery) return others;
    const clean = normalizedTagFilter || trimmedQuery.replace(/^@/, '');
    return others.filter(
      (u) =>
        u.usernameLower.includes(clean) ||
        u.fullNameLower.includes(clean) ||
        u.bio.toLowerCase().includes(clean) ||
        u.location.toLowerCase().includes(clean)
    );
  }, [allUsers, currentUser.uid, normalizedTagFilter, trimmedQuery]);

  const suggestedUsers = useMemo(() => {
    return allUsers
      .filter((u) => u.uid !== currentUser.uid && !followingIds.has(u.uid))
      .sort((a, b) => b.followersCount - a.followersCount || b.postsCount - a.postsCount)
      .slice(0, 6);
  }, [allUsers, currentUser.uid, followingIds]);

  const matchingPosts = useMemo(() => {
    if (!trimmedQuery) return posts;
    if (normalizedTagFilter) {
      return posts.filter(
        (p) =>
          (p.hashtags || []).includes(normalizedTagFilter) ||
          p.content.toLowerCase().includes(`#${normalizedTagFilter}`)
      );
    }
    return posts.filter(
      (p) =>
        p.content.toLowerCase().includes(trimmedQuery) ||
        p.authorName.toLowerCase().includes(trimmedQuery) ||
        p.authorUsername.toLowerCase().includes(trimmedQuery) ||
        (p.hashtags || []).some((t) => t.includes(trimmedQuery))
    );
  }, [normalizedTagFilter, posts, trimmedQuery]);

  const trendingPosts = useMemo(() => {
    return [...matchingPosts].sort((a, b) => {
      const scoreA = a.likesCount * 2 + a.commentsCount;
      const scoreB = b.likesCount * 2 + b.commentsCount;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);
    });
  }, [matchingPosts]);

  return (
    <div>
      <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people, posts, or #hashtags (e.g. #technology)..."
            className="w-full pl-10 pr-9 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-zinc-900 dark:focus:border-zinc-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Trending Hashtags Bar (computed from live post tags) */}
        {trendingHashtags.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Trending hashtags
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {trendingHashtags.map(({ tag, count }) => {
                const isSelected = normalizedTagFilter === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSearchQuery(isSelected ? '' : `#${tag}`)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                        : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                    }`}
                  >
                    <Hash className="w-3 h-3 opacity-70" />
                    <span>{tag}</span>
                    <span className="font-mono-num text-[10px] opacity-65 ml-0.5">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setActiveSubTab('grid')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'grid'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Explore grid ({matchingPosts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('trending')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'trending'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Top posts</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('people')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'people'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            People ({matchingUsers.length})
          </button>
        </div>
      </div>

      {!trimmedQuery && suggestedUsers.length > 0 && activeSubTab !== 'people' && (
        <section className="border-b border-zinc-200 dark:border-zinc-800 px-5 py-4 bg-zinc-50/50 dark:bg-zinc-900/30">
          <h2 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-3">
            Suggested people
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestedUsers.slice(0, 4).map((person) => {
              const isFollowing = followingIds.has(person.uid);
              return (
                <div
                  key={person.uid}
                  className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                >
                  <button
                    type="button"
                    onClick={() => onOpenProfile(person.uid)}
                    className="flex items-center gap-2.5 min-w-0 text-left group"
                  >
                    <Avatar src={person.avatarUrl} name={person.fullName} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:underline">
                        {person.fullName}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        @{person.username}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => void actions.toggleFollow(person, isFollowing)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      isFollowing
                        ? 'border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {activeSubTab === 'people' ? (
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {matchingUsers.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No users matched "{searchQuery}".
            </div>
          ) : (
            matchingUsers.map((person) => {
              const isFollowing = followingIds.has(person.uid);
              return (
                <div
                  key={person.uid}
                  className="px-5 py-4 flex items-start justify-between gap-4 bg-white dark:bg-zinc-950 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => onOpenProfile(person.uid)}
                    className="flex items-start gap-3.5 min-w-0 text-left group"
                  >
                    <Avatar src={person.avatarUrl} name={person.fullName} size="md" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:underline truncate">
                          {person.fullName}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          @{person.username}
                        </span>
                        {person.isDemo && (
                          <>
                            <span
                              aria-hidden="true"
                              className="text-xs text-zinc-300 dark:text-zinc-700"
                            >
                              &middot;
                            </span>
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                              Demo account
                            </span>
                          </>
                        )}
                      </div>
                      {person.bio && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                          {person.bio}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="font-mono-num">{person.followersCount} followers</span>
                        <span aria-hidden="true">&middot;</span>
                        <span className="font-mono-num">{person.postsCount} posts</span>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => void actions.toggleFollow(person, isFollowing)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      isFollowing
                        ? 'border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
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
                </div>
              );
            })
          )}
        </div>
      ) : activeSubTab === 'grid' ? (
        <div className="p-4 bg-white dark:bg-zinc-950">
          {matchingPosts.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No posts matched your search.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {matchingPosts.map((post) => {
                const author = usersMap[post.authorId];
                const authorName = author?.fullName || post.authorName;
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => onOpenPostDetail(post)}
                    className="group relative aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                  >
                    {post.imageUrl ? (
                      <img
                        src={post.imageUrl}
                        alt={`Explore post by ${authorName}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full p-3.5 flex flex-col justify-between bg-zinc-50 dark:bg-zinc-900">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          @{author?.username || post.authorUsername}
                        </p>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-4 leading-relaxed">
                          {post.content}
                        </p>
                        <span className="text-[11px] font-mono-num text-zinc-400">
                          {post.hashtags?.[0] ? `#${post.hashtags[0]}` : 'Note'}
                        </span>
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-zinc-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3 text-white">
                      <span className="text-[11px] font-medium truncate">
                        @{author?.username || post.authorUsername}
                      </span>
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
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div>
          {trendingPosts.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No public posts found.
            </div>
          ) : (
            trendingPosts.map((post) => (
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
      )}
    </div>
  );
}
