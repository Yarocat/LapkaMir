# Security Specification & Payload-First Verification

## 1. Data Invariants
1. `users/{uid}` is strictly owned by `request.auth.uid == uid` and stores NO PII (`email`, `phone`, `address`). Synthetic `@avatar.local` login usernames are allowed; `email_verified` is not required because synthetic domains cannot receive verification emails.
2. `online_players/{uid}` can only be created, updated, or deleted by the authenticated owner `request.auth.uid == uid`. `roomId` must belong to `['central', 'cafe', 'shop', 'next_street']`, coordinates `x` and `y` must be bounded (`0 <= x <= 2000`, `0 <= y <= 1200`), and `lastMessage.size() <= 220`.
3. `messages/{messageId}` can only be created by an authenticated user whose `uid == request.auth.uid`, with `text.size() >= 1 && text.size() <= 220`, `roomId` in the allowed room set, and server timestamp `createdAt == request.time`.
4. All document IDs (`uid`, `messageId`) must pass `isValidId()` (`size() <= 128 && matches('^[a-zA-Z0-9_\\-]+$')`).
5. All `create` and `update` operations enforce exact allowed key sets via `keys().hasAll(...) && keys().hasOnly(...)` and `affectedKeys().hasOnly(...)` to block shadow/ghost fields.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. Unauthenticated read/write to `/users/user1`
2. Authenticated `userA` attempting to read or write `/users/userB`
3. Creating `/users/userA` with a ghost field `{ isAdmin: true }`
4. Updating `/users/userA` trying to mutate immutable `createdAt` or `uid`
5. Creating `/users/userA` with a 500-character `name` exceeding `maxLength: 24`
6. Authenticated `userA` attempting to update `/online_players/userB` (position spoofing)
7. Creating `/online_players/userA` with invalid `roomId: "secret_room"`
8. Updating `/online_players/userA` with out-of-bounds coordinates `x: 999999`
9. Creating `/online_players/userA` with `outfit` containing invalid extra keys or 1KB strings
10. Creating `/messages/msg1` as `userA` with spoofed `uid: "userB"`
11. Creating `/messages/msg1` with client-forged `createdAt` timestamp != `request.time`
12. Updating or deleting `/messages/msg1` (chat history is append-only)
