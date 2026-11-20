# Security Specification — Glam & Graph Firestore

## 1. Data Invariants
1. **Authentication & Verification**: All reads and writes require an authenticated user with a verified email (`request.auth != null && request.auth.token.email_verified == true`).
2. **Strict Ownership**:
   - `/users/{userId}` can only be read (`get`), created, or updated by `request.auth.uid == userId`, and `incoming().ownerId == request.auth.uid`.
   - Blanket listing of `/users` is forbidden (`allow list: if false;`).
   - `/users/{userId}/figures/{figureId}` can only be read, listed, created, updated, or deleted when `userId == request.auth.uid` and `ownerId == request.auth.uid`.
3. **Master Gate (Parent Existence)**: Creating or updating a `SavedFigure` requires the parent `/users/{userId}` document to already exist.
4. **Immutability & Server Time**: `ownerId` and `createdAt` are immutable after creation. `createdAt` must equal `request.time` on create; `updatedAt` must equal `request.time` on create and update.
5. **Strict Schema & Bounds**: Unknown/ghost fields are rejected on create (`hasAll` + `hasOnly`) and update (`affectedKeys().hasOnly(...)`). All strings, arrays, maps, and document IDs have strict type and size limits.
6. **Zero-Trust Query Enforcement**: `allow list` on `/users/{userId}/figures/{figureId}` explicitly checks `resource.data.ownerId == request.auth.uid` without calling `get()` or `exists()`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write**: Create `/users/userA` with `request.auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Create `/users/userA` with `email_verified: false` -> `PERMISSION_DENIED`.
3. **Cross-User Read**: User B calls `get(/users/userA)` -> `PERMISSION_DENIED`.
4. **User Directory Enumeration**: User A calls `list(/users)` -> `PERMISSION_DENIED`.
5. **Identity Spoofing on Create**: User A creates `/users/userA/figures/fig1` with `ownerId: "userB"` -> `PERMISSION_DENIED`.
6. **Ghost Field Shadow Injection**: User A creates `/users/userA` adding `"isAdmin": true` -> `PERMISSION_DENIED`.
7. **Orphaned Subcollection Write**: User A creates `/users/userA/figures/fig1` before `/users/userA` exists -> `PERMISSION_DENIED`.
8. **ID Poisoning**: User A writes `/users/userA/figures/bad..id$123` or >128 chars -> `PERMISSION_DENIED`.
9. **Immutable Timestamp Tampering**: User A updates `/users/userA` changing `createdAt` or forging `updatedAt` to a past timestamp -> `PERMISSION_DENIED`.
10. **Immutable Owner Tampering**: User A updates `/users/userA/figures/fig1` changing `ownerId` -> `PERMISSION_DENIED`.
11. **Value/Array Exhaustion**: User A creates `/users/userA` with `solvedIds.size() > 350` or invalid negative `glamStars` -> `PERMISSION_DENIED`.
12. **Unconstrained List Query**: User B attempts `list(/users/userA/figures)` -> `PERMISSION_DENIED`.
