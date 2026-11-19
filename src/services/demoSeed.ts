import { doc, getDoc, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { extractHashtags } from '../lib/validation';
import type { Post, Story, UserPublic } from '../types/social';

export const HERO_STUDIO_IMAGE = '/src/assets/images/connectsphere_hero_studio_1795086139397.jpg';
export const ARCH_PHOTO_IMAGE = '/src/assets/images/post_architecture_light_1795086140297.jpg';
export const CERAMIC_PHOTO_IMAGE = '/src/assets/images/post_ceramic_craft_1795086139071.jpg';
export const COASTAL_PHOTO_IMAGE = '/src/assets/images/post_coastal_horizon_1795086139112.jpg';
export const TECH_PROGRAMMING_IMAGE = '/src/assets/images/post_tech_programming_1795086884522.jpg';
export const COLLEGE_CAMPUS_IMAGE = '/src/assets/images/post_college_campus_1795086885803.jpg';
export const TRAVEL_MOUNTAIN_IMAGE = '/src/assets/images/post_travel_mountain_1795086885272.jpg';

export const CURATED_COVER_PRESETS = [
  { label: 'Architectural Studio', url: HERO_STUDIO_IMAGE },
  { label: 'Coastal Horizon', url: COASTAL_PHOTO_IMAGE },
  { label: 'Alpine Ridge', url: TRAVEL_MOUNTAIN_IMAGE },
];

export interface DemoUserSeed {
  uid: string;
  username: string;
  fullName: string;
  bio: string;
  location: string;
  coverUrl: string;
  joinedDaysAgo: number;
}

export interface DemoPostSeed {
  id: string;
  authorId: string;
  content: string;
  imageUrl: string;
  minutesAgo: number;
}

export interface DemoStorySeed {
  id: string;
  authorId: string;
  mediaUrl: string;
  caption: string;
  hoursAgo: number;
}

export const DEMO_USERS_SEED: DemoUserSeed[] = [
  {
    uid: 'demo_tech_alex',
    username: 'alex_systems_demo',
    fullName: 'Alex Chen (Demo)',
    bio: 'Systems engineer writing about TypeScript compilers, local-first sync, and clean API design.',
    location: 'Seattle, WA',
    coverUrl: TECH_PROGRAMMING_IMAGE,
    joinedDaysAgo: 74,
  },
  {
    uid: 'demo_photo_marcus',
    username: 'marcus_frames_demo',
    fullName: 'Marcus Vance (Demo)',
    bio: 'Architectural and street photographer. Chasing natural geometry on 35mm.',
    location: 'Tokyo, JP',
    coverUrl: ARCH_PHOTO_IMAGE,
    joinedDaysAgo: 58,
  },
  {
    uid: 'demo_college_priya',
    username: 'priya_campus_demo',
    fullName: 'Priya Nair (Demo)',
    bio: 'CS junior researching distributed databases. Balancing lab projects, hackathons, and campus coffee runs.',
    location: 'Berkeley, CA',
    coverUrl: COLLEGE_CAMPUS_IMAGE,
    joinedDaysAgo: 42,
  },
  {
    uid: 'demo_travel_liam',
    username: 'liam_trails_demo',
    fullName: 'Liam OConnor (Demo)',
    bio: 'Field journalist and alpine hiker documenting quiet mountain passes and coastal trains.',
    location: 'Zurich, CH',
    coverUrl: TRAVEL_MOUNTAIN_IMAGE,
    joinedDaysAgo: 65,
  },
  {
    uid: 'demo_code_elena',
    username: 'elena_craft_demo',
    fullName: 'Elena Rostova (Demo)',
    bio: 'Design engineer & ceramicist. Building tactile web tools by day, firing stoneware by night.',
    location: 'Copenhagen, DK',
    coverUrl: CERAMIC_PHOTO_IMAGE,
    joinedDaysAgo: 91,
  },
];

export const DEMO_POSTS_SEED: DemoPostSeed[] = [
  {
    id: 'demo_post_tech_1',
    authorId: 'demo_tech_alex',
    content:
      'Refactored our edge caching layer down to 140 lines of typed state transitions. Removing hidden implicit retries cut tail latency in half. #technology #programming #architecture',
    imageUrl: TECH_PROGRAMMING_IMAGE,
    minutesAgo: 28,
  },
  {
    id: 'demo_post_photo_1',
    authorId: 'demo_photo_marcus',
    content:
      'Morning shadow study outside the concrete courtyard. Waiting twenty minutes for a single silhouette to cross the light diagonal changes the entire frame. #photography #architecture',
    imageUrl: ARCH_PHOTO_IMAGE,
    minutesAgo: 75,
  },
  {
    id: 'demo_post_college_1',
    authorId: 'demo_college_priya',
    content:
      'Late afternoon study sprint in the engineering quad before systems finals. Two whiteboards full of Raft consensus diagrams and one very cold espresso. #collegelife #programming #computerscience',
    imageUrl: COLLEGE_CAMPUS_IMAGE,
    minutesAgo: 145,
  },
  {
    id: 'demo_post_travel_1',
    authorId: 'demo_travel_liam',
    content:
      'First light breaking over the high ridge after a 5 AM ascent. Cold wind, crisp horizon, and zero cell reception for six hours. #travel #photography #mountains',
    imageUrl: TRAVEL_MOUNTAIN_IMAGE,
    minutesAgo: 230,
  },
  {
    id: 'demo_post_code_1',
    authorId: 'demo_code_elena',
    content:
      'Fresh out of the kiln: matte manganese charcoal stoneware paired with speckled bone porcelain on travertine. Same rule applies to software interfaces: remove everything that does not earn its space. #design #craft',
    imageUrl: CERAMIC_PHOTO_IMAGE,
    minutesAgo: 340,
  },
  {
    id: 'demo_post_tech_2',
    authorId: 'demo_tech_alex',
    content:
      'Quick programming tip: validate every incoming mutation against your schema bounds before hitting the database layer. Explicit contracts turn cryptic permission failures into clear feedback. #programming #technology #typescript',
    imageUrl: '',
    minutesAgo: 460,
  },
  {
    id: 'demo_post_travel_2',
    authorId: 'demo_travel_liam',
    content:
      'Fog lifting off the northern cliffs along the coastal trail just before sunrise. #travel #coastal',
    imageUrl: COASTAL_PHOTO_IMAGE,
    minutesAgo: 820,
  },
  {
    id: 'demo_post_code_2',
    authorId: 'demo_code_elena',
    content:
      'Rearranged the studio desk for north-facing daylight. Fewer open tabs and physical notebooks on the table make long build sessions much calmer. #design #technology',
    imageUrl: HERO_STUDIO_IMAGE,
    minutesAgo: 1280,
  },
];

export const DEMO_STORIES_SEED: DemoStorySeed[] = [
  {
    id: 'demo_story_tech_1',
    authorId: 'demo_tech_alex',
    mediaUrl: TECH_PROGRAMMING_IMAGE,
    caption: 'Late night TypeScript build sprint & telemetry check #programming',
    hoursAgo: 2,
  },
  {
    id: 'demo_story_photo_1',
    authorId: 'demo_photo_marcus',
    mediaUrl: ARCH_PHOTO_IMAGE,
    caption: 'Concrete light angles at 8:15 AM #photography',
    hoursAgo: 4,
  },
  {
    id: 'demo_story_college_1',
    authorId: 'demo_college_priya',
    mediaUrl: COLLEGE_CAMPUS_IMAGE,
    caption: 'Quad library steps between lectures #collegelife',
    hoursAgo: 6,
  },
  {
    id: 'demo_story_travel_1',
    authorId: 'demo_travel_liam',
    mediaUrl: TRAVEL_MOUNTAIN_IMAGE,
    caption: 'Summit ridge at dawn #travel',
    hoursAgo: 9,
  },
];

export function buildDemoObjectsForPrototype(): {
  users: Record<string, UserPublic>;
  posts: Post[];
  stories: Story[];
} {
  const users: Record<string, UserPublic> = {};
  const postCountByUser: Record<string, number> = {};
  for (const p of DEMO_POSTS_SEED) {
    postCountByUser[p.authorId] = (postCountByUser[p.authorId] || 0) + 1;
  }

  for (const seed of DEMO_USERS_SEED) {
    users[seed.uid] = {
      uid: seed.uid,
      username: seed.username,
      usernameLower: seed.username.toLowerCase(),
      fullName: seed.fullName,
      fullNameLower: seed.fullName.toLowerCase(),
      bio: seed.bio,
      location: seed.location,
      avatarUrl: '',
      coverUrl: seed.coverUrl,
      postsCount: postCountByUser[seed.uid] || 0,
      followersCount: 0,
      followingCount: 0,
      isPublic: true,
      isDemo: true,
      joinedAt: Timestamp.fromMillis(Date.now() - seed.joinedDaysAgo * 24 * 60 * 60 * 1000),
      updatedAt: Timestamp.fromMillis(Date.now() - 30 * 60 * 1000),
    };
  }

  const posts: Post[] = DEMO_POSTS_SEED.map((seed) => {
    const author = users[seed.authorId];
    const ts = Timestamp.fromMillis(Date.now() - seed.minutesAgo * 60 * 1000);
    return {
      id: seed.id,
      authorId: seed.authorId,
      authorUsername: author.username,
      authorName: author.fullName,
      authorAvatarUrl: author.avatarUrl,
      content: seed.content,
      imageUrl: seed.imageUrl,
      hashtags: extractHashtags(seed.content),
      visibility: 'public',
      isDemo: true,
      likesCount: 0,
      commentsCount: 0,
      createdAt: ts,
      updatedAt: ts,
    };
  });

  const stories: Story[] = DEMO_STORIES_SEED.map((seed) => {
    const author = users[seed.authorId];
    const createdMs = Date.now() - seed.hoursAgo * 60 * 60 * 1000;
    return {
      id: seed.id,
      authorId: seed.authorId,
      authorUsername: author.username,
      authorName: author.fullName,
      authorAvatarUrl: author.avatarUrl,
      mediaUrl: seed.mediaUrl,
      caption: seed.caption,
      isPublic: true,
      isDemo: true,
      viewsCount: 0,
      createdAt: Timestamp.fromMillis(createdMs),
      expiresAt: Timestamp.fromMillis(createdMs + 24 * 60 * 60 * 1000),
    };
  });

  return { users, posts, stories };
}

let seedInFlight: Promise<void> | null = null;

export async function seedDemoContentIfNeeded(): Promise<void> {
  if (seedInFlight) return seedInFlight;

  seedInFlight = (async () => {
    try {
      const markerSnap = await getDoc(doc(db, 'users', DEMO_USERS_SEED[0].uid));
      const storiesMarkerSnap = await getDoc(doc(db, 'stories', DEMO_STORIES_SEED[0].id));
      if (markerSnap.exists() && storiesMarkerSnap.exists()) {
        return;
      }

      const postCountByUser: Record<string, number> = {};
      for (const p of DEMO_POSTS_SEED) {
        postCountByUser[p.authorId] = (postCountByUser[p.authorId] || 0) + 1;
      }

      const batch = writeBatch(db);
      let pendingWrites = 0;

      for (const seed of DEMO_USERS_SEED) {
        const userRef = doc(db, 'users', seed.uid);
        const existing = await getDoc(userRef);
        if (!existing.exists()) {
          batch.set(userRef, {
            uid: seed.uid,
            username: seed.username,
            usernameLower: seed.username.toLowerCase(),
            fullName: seed.fullName,
            fullNameLower: seed.fullName.toLowerCase(),
            bio: seed.bio,
            location: seed.location,
            avatarUrl: '',
            coverUrl: seed.coverUrl,
            postsCount: postCountByUser[seed.uid] || 0,
            followersCount: 0,
            followingCount: 0,
            isPublic: true,
            isDemo: true,
            joinedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          pendingWrites++;
        }
      }

      const usersById = Object.fromEntries(DEMO_USERS_SEED.map((u) => [u.uid, u]));

      for (const seed of DEMO_POSTS_SEED) {
        const postRef = doc(db, 'posts', seed.id);
        const existing = await getDoc(postRef);
        if (!existing.exists()) {
          const author = usersById[seed.authorId];
          batch.set(postRef, {
            id: seed.id,
            authorId: seed.authorId,
            authorUsername: author.username,
            authorName: author.fullName,
            authorAvatarUrl: '',
            content: seed.content,
            imageUrl: seed.imageUrl,
            hashtags: extractHashtags(seed.content),
            visibility: 'public',
            isDemo: true,
            likesCount: 0,
            commentsCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          pendingWrites++;
        }
      }

      for (const seed of DEMO_STORIES_SEED) {
        const storyRef = doc(db, 'stories', seed.id);
        const existing = await getDoc(storyRef);
        if (!existing.exists()) {
          const author = usersById[seed.authorId];
          const expiresAt = Timestamp.fromMillis(
            Date.now() + (24 - seed.hoursAgo) * 60 * 60 * 1000
          );
          batch.set(storyRef, {
            id: seed.id,
            authorId: seed.authorId,
            authorUsername: author.username,
            authorName: author.fullName,
            authorAvatarUrl: '',
            mediaUrl: seed.mediaUrl,
            caption: seed.caption,
            isPublic: true,
            isDemo: true,
            viewsCount: 0,
            createdAt: serverTimestamp(),
            expiresAt,
          });
          pendingWrites++;
        }
      }

      if (pendingWrites > 0) {
        await batch.commit();
      }
    } catch (err) {
      // Fail gracefully without crashing workspace if offline or quota-limited
      console.warn('Demo seed skipped:', err);
    }
  })();

  try {
    await seedInFlight;
  } finally {
    seedInFlight = null;
  }
}
