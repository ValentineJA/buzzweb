# Live social features

The five social tabs now use authenticated MongoDB APIs. The database starts empty except for existing accounts; there are no seeded social posts, fake counts, or simulated replies.

## Deployment

Deploy the updated repository to Vercel. Continue to set NODE_OPTIONS=--experimental-require-module, Firebase credentials, MONGODB_URI, MONGODB_DB and the trusted deployment origins. MongoDB's database user needs read/write and create-index access. Indexes are provisioned on first social API access. No additional paid service or key is needed for these features.

Photo uploads accept JPEG, PNG and WebP, up to 3 MB, stored in MongoDB and served through a session- and audience-checked route. Limit: 30 uploads per account per day. Existing media is never public just because someone knows its URL.

## Behaviour

- People search uses real names and handles; discoverability settings control inclusion. Public follows take effect immediately; private accounts approve requests in Settings.
- Public and follower-only posts, events, location posts, after photos, live events and 24-hour stories share a persisted feed. The owner's private-profile setting further restricts visibility. Expired stories are excluded on the server (expiry does not immediately erase the stored record).
- Authors can edit/delete their posts. Likes and saves are idempotent per user/post. Replies belong to their authors; the post owner can remove replies for moderation. Events use self-reported RSVP/check-in records, not device-derived headcounts.
- Explore has real event search, category/free filters, optional browser-location radius filtering, saved defaults, and a map focused on a selected event with coordinates. OpenStreetMap is used for map rendering; the map provider receives the displayed event coordinates. Browser location is used for search, not stored as profile data.
- DMs, groups and event-linked party rooms store messages and memberships in MongoDB. Group-invitation and DM preferences are enforced server-side. Only event organisers create their party rooms; only room owners rename, close, change expiry or remove members. Only message authors edit/delete messages. Expired rooms remain readable to members but reject writes. Messages refresh every 5 seconds while the tab is visible; this is polling, not WebSockets or push notifications.
- Blocking hides profiles/content in both directions and blocks conversations containing the blocked account. A group containing a blocked participant becomes unavailable to the blocking user until membership changes or the block is removed.
- Settings persist privacy, comment/DM/invitation rules, read receipts, in-app notifications, discovery defaults, room expiry defaults, colour theme and reduced motion. Unsupported prototype settings were removed rather than presented as working switches. Password/email/provider management and session revocation use the existing Firebase-backed security screen.
- Reports are stored for Admin/SubAdmin review in Settings; reporters can view their own report history. Reports preserve the reported text at submission. Review status does not automatically remove or edit someone else's content.
- Data export includes own profile and authored content as JSON. Account deletion requires a matching authenticated session, Firebase token with sign-in within five minutes, and explicit DELETE confirmation. It hides the profile, removes authored data/media, closes owned rooms, removes memberships, and deletes the Firebase identity. Safety reports are retained. Cloud service outages during multi-service deletion may require cleanup/retry; there is no cross-service transaction.

## Verification

Run `npm run test:auth`, `npm run lint`, and `npm run build`.

For end-to-end API checks, build first, then set BUZZ_TEST_PASSWORD_1 and BUZZ_TEST_PASSWORD_2 in the shell and run `node tests/social-integration.mjs`. The suite authenticates the two existing Firebase test users, creates a randomly named temporary MongoDB database, copies their account records into that database, and runs a local production server on port 3197. It does not modify app data. Cleanup removes only the marked temporary database. Additional disposable Firebase identities, if created by the suite, are removed during cleanup. Never commit test passwords.

## Operational boundaries

This is a functional first release, not a claim of unlimited production scale. Social context currently loads the user directory/preferences per request; larger communities should replace this with targeted queries or aggregation joins. Feed and message pages are bounded; notifications and conversation lists currently show the latest 50 and 100 records. Uploaded images are capped, but abandoned/unlinked media needs a retention job for long-running installations. Automated moderation, push delivery, email campaigns, video, multi-photo albums, typing indicators, voice/video calling, MFA and browser-device session inventories are not exposed as functional features.

For optional phone-width browser verification, set BUZZ_BROWSER to an installed Chrome/Edge executable before running the integration suite. Screenshots are saved in the ignored test-results directory. Browser profiles and fixture data are temporary.
