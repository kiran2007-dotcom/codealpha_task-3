# ConnectSphere Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **PII Isolation**: User email addresses and private account metadata are stored exclusively in `/users/{userId}/private/account` and never in `/users/{userId}`. Only the owner (`request.auth.uid == userId`) can read or write `/users/{userId}/private/account`.
2. **Unique Usernames**: Every `/usernames/{usernameLower}` claim maps 1-to-1 to a verified user `uid` and cannot be overwritten by another user (`!exists(...)` on create).
3. **Authorship Integrity**: Every post, comment, like, follow, notification actor, and message sender must match `request.auth.uid` on creation and remain immutable on update.
4. **No Self-Follow / No Self-Notification**: A user cannot create a `/followers/{followId}` record where `followerId == followingId`, nor a notification where `actorId == recipientId`.
5. **Duplicate Prevention**: Likes use deterministic IDs `{postId}_{userId}` and follows use `{followerId}_{followingId}`, enforced in rules.
6. **Atomic Counter Integrity**: Updating `posts.likesCount` by `±1` requires atomic presence/absence of `/likes/{postId}_{uid}` via `existsAfter()`. Updating `users.followersCount` by `±1` requires atomic presence/absence of `/followers/{uid}_{targetUid}` via `existsAfter()`.
7. **Private Messaging Containment**: Only the 2 UIDs in `participantIds` (`size == 2`) can read, list, or create messages in a conversation; messages require an existing parent conversation where the sender is a participant.
8. **Temporal Integrity**: All `createdAt` and `updatedAt` fields must equal `request.time` on creation/update, and `createdAt` is immutable after creation.
9. **Resource Exhaustion Guard**: Every ID matches `^[a-zA-Z0-9_\-]+$` (`<= 128` chars) and every string/array enforces strict length limits.

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Target Collection | Attack Vector | Adversarial Payload Summary | Expected Outcome |
|---|-------------------|---------------|-----------------------------|------------------|
| 1 | `/users/{victimId}` | Cross-User Profile Tampering | Authenticated attacker updates `bio` on `victimId` | `PERMISSION_DENIED` |
| 2 | `/users/{attackerId}` | Shadow Field / Ghost Privilege Injection | Attacker creates profile with extra field `isVerified: true` or `role: "admin"` | `PERMISSION_DENIED` |
| 3 | `/users/{attackerId}/private/account` | PII Harvesting | Attacker calls `get` on victim's `/users/{victimId}/private/account` | `PERMISSION_DENIED` |
| 4 | `/posts/{postId}` | Identity Spoofing | Attacker creates post with `authorId: "victimUid"` | `PERMISSION_DENIED` |
| 5 | `/posts/{postId}` | Terminal/Immutable Field Tampering | Author updates `likesCount: 99999` or `createdAt` during post edit | `PERMISSION_DENIED` |
| 6 | `/likes/{postId}_{victimId}` | Forged / Duplicate Like | Attacker creates like document with `userId: "victimId"` or arbitrary random ID | `PERMISSION_DENIED` |
| 7 | `/followers/{uid}_{uid}` | Self-Follow Loop | User creates `/followers/{uid}_{uid}` with `followerId == followingId` | `PERMISSION_DENIED` |
| 8 | `/users/{victimId}` | Unbacked Follower Count Inflation | Attacker increments `victim.followersCount` without creating a `/followers` edge | `PERMISSION_DENIED` |
| 9 | `/comments/{commentId}` | Cross-User Comment Deletion | Attacker deletes or edits comment authored by `victimId` | `PERMISSION_DENIED` |
| 10 | `/messages/{messageId}` | Eavesdropping / Unauthorized DM Read | Non-participant `mallory` lists or reads `/messages` or `/conversations` | `PERMISSION_DENIED` |
| 11 | `/posts/{1500char_id}` | Resource Poisoning / ID Overflow | Attacker creates document with 1500-char ID or 10KB `username` | `PERMISSION_DENIED` |
| 12 | `/notifications/{notifId}` | Unverified / Spoofed Timestamp | Attacker creates notification with `email_verified: false` or backdated `createdAt` | `PERMISSION_DENIED` |
