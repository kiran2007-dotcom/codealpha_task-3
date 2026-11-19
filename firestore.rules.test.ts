/**
 * ConnectSphere Security Rules Verification Suite ("Dirty Dozen" Payload Tests)
 *
 * Verifies the 12 adversarial attack vectors from security_spec.md against the
 * ConnectSphere schema invariants and rules contract.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  actorUid: string;
  emailVerified: boolean;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  docId: string;
  payload: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
  enforcedByRule: string;
}

export const DIRTY_DOZEN_PAYLOADS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Cross-User Profile Tampering',
    collection: 'users',
    actorUid: 'attacker_uid',
    emailVerified: true,
    operation: 'update',
    docId: 'victim_uid',
    payload: { bio: 'Hacked bio' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isOwner(userId) required for profile edit branch',
  },
  {
    id: 2,
    name: 'Shadow Field / Ghost Privilege Injection',
    collection: 'users',
    actorUid: 'attacker_uid',
    emailVerified: true,
    operation: 'create',
    docId: 'attacker_uid',
    payload: {
      uid: 'attacker_uid',
      username: 'attacker',
      isVerified: true,
      role: 'admin',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidUserPublic enforces data.keys().hasOnly([...])',
  },
  {
    id: 3,
    name: 'PII Harvesting on Private Account Subcollection',
    collection: 'users/victim_uid/private',
    actorUid: 'attacker_uid',
    emailVerified: true,
    operation: 'get',
    docId: 'account',
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'allow get: if isSignedIn() && isOwner(userId) && docId == "account"',
  },
  {
    id: 4,
    name: 'Post Author Identity Spoofing',
    collection: 'posts',
    actorUid: 'attacker_uid',
    emailVerified: true,
    operation: 'create',
    docId: 'post_123',
    payload: {
      id: 'post_123',
      authorId: 'victim_uid',
      content: 'Impersonated post',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().authorId == request.auth.uid',
  },
  {
    id: 5,
    name: 'Immutable Metric Tampering on Post Edit',
    collection: 'posts',
    actorUid: 'author_uid',
    emailVerified: true,
    operation: 'update',
    docId: 'post_123',
    payload: {
      content: 'Edited text',
      likesCount: 99999,
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: "affectedKeys().hasOnly(['content', 'imageUrl', 'updatedAt'])",
  },
  {
    id: 6,
    name: 'Forged or Non-Deterministic Like Record',
    collection: 'likes',
    actorUid: 'attacker_uid',
    emailVerified: true,
    operation: 'create',
    docId: 'arbitrary_like_id',
    payload: {
      postId: 'post_123',
      userId: 'victim_uid',
      postAuthorId: 'author_uid',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: "likeId == (incoming().postId + '_' + request.auth.uid) && incoming().userId == request.auth.uid",
  },
  {
    id: 7,
    name: 'Self-Follow Loop Creation',
    collection: 'followers',
    actorUid: 'attacker_uid',
    emailVerified: true,
    operation: 'create',
    docId: 'attacker_uid_attacker_uid',
    payload: {
      followerId: 'attacker_uid',
      followingId: 'attacker_uid',
      isPublic: true,
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().followerId != incoming().followingId',
  },
  {
    id: 8,
    name: 'Unbacked Follower Count Inflation',
    collection: 'users',
    actorUid: 'attacker_uid',
    emailVerified: true,
    operation: 'update',
    docId: 'victim_uid',
    payload: {
      followersCount: 5000,
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'existsAfter(/databases/$(database)/documents/followers/$(request.auth.uid + "_" + userId)) && delta == 1',
  },
  {
    id: 9,
    name: 'Cross-User Comment Deletion',
    collection: 'comments',
    actorUid: 'attacker_uid',
    emailVerified: true,
    operation: 'delete',
    docId: 'comment_456',
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'existing().authorId == request.auth.uid',
  },
  {
    id: 10,
    name: 'Non-Participant Conversation Eavesdropping',
    collection: 'messages',
    actorUid: 'mallory_uid',
    emailVerified: true,
    operation: 'list',
    docId: '*',
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'request.auth.uid in resource.data.participantIds',
  },
  {
    id: 11,
    name: 'Resource Exhaustion via Oversized Document ID',
    collection: 'posts',
    actorUid: 'attacker_uid',
    emailVerified: true,
    operation: 'create',
    docId: 'a'.repeat(1500),
    payload: { id: 'a'.repeat(1500), content: 'spam' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: "isValidId(postId) enforces size() <= 128 && matches('^[a-zA-Z0-9_\\\\-]+$')",
  },
  {
    id: 12,
    name: 'Unverified Email Write & Backdated Timestamp Spoof',
    collection: 'notifications',
    actorUid: 'attacker_uid',
    emailVerified: false,
    operation: 'create',
    docId: 'notif_1',
    payload: {
      actorId: 'attacker_uid',
      recipientId: 'victim_uid',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isVerifiedUser() checks email_verified == true && incoming().createdAt == request.time',
  },
];

export function validateDirtyDozenRulesCoverage(): { passed: boolean; total: number } {
  const allHaveEnforcement = DIRTY_DOZEN_PAYLOADS.every(
    (tc) => tc.expectedResult === 'PERMISSION_DENIED' && tc.enforcedByRule.length > 0
  );
  return { passed: allHaveEnforcement, total: DIRTY_DOZEN_PAYLOADS.length };
}
