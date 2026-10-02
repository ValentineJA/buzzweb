# BUZZ authentication setup

## What is implemented

- Email/password signup and sign-in; Google, X (Twitter), and Facebook Login through Firebase.
- Private birthday + explicit 18+ confirmation. Signup/onboarding and server session creation check eligibility. A Google/X/Facebook login cannot skip onboarding.
- Email verification, resend, recovery email, custom password-reset/email-action screens, password change, email change with verification, provider linking/unlinking, logout and session revocation across devices.
- Firebase Admin-verified HttpOnly sessions, SameSite=Lax, Secure in production, recent-auth requirement when minting sessions, and exact Origin checks on mutations.
- MongoDB users with unique case-insensitive handles, private birthday, editable profile, and server-assigned roles. Signup only creates `member` accounts. Admin/SubAdmin roles are provisioned server-side.
- All five app routes require an adult, verified, enabled account. API profile writes independently verify the session. Future APIs must also call the authentication/authorization helpers; a layout or hidden button is not an API security boundary.
- Local demo chats/preferences are scoped to the Firebase UID. Profile edits are now stored in MongoDB.

Age is self-declared, not government-ID/identity-provider age verification. An entered birthday can be false. The app enforces the supplied date and does not claim to establish a person's actual age. DOB cannot be changed through the public profile endpoint.

## Configuration needed now

A private `.env.local` has been prepared with empty service configuration and the two requested test passwords. It is Git-ignored. `.env.example` is the safe, tracked template. Do not paste private keys into source files or a public chat.

Fill these values in `.env.local`:

| Values | Where to find them |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Console → Project settings → Your apps → Web app config |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase Console → Project settings → Service accounts → private key JSON; use `project_id`, `client_email`, `private_key` |
| `MONGODB_URI`, `MONGODB_DB` | MongoDB Atlas → Connect → Drivers; use a database user restricted to the chosen BUZZ database |
| `APP_URL` | Exact website origin, initially `http://localhost:3000`; update if the dev port changes |
| `FIREBASE_TEST_PROJECT_ID` | Explicitly repeat the isolated development Firebase project ID before seeding test users |

The public Firebase identifiers are not admin secrets. Never put the service-account private key, MongoDB URI, or test passwords into any `NEXT_PUBLIC_` variable. Use a single quoted PEM value with escaped `\n` line breaks. Use secret/environment management in hosting for production.

Configure Atlas network access for your development/deployment server. Restart Next.js after editing `.env.local`. Client `NEXT_PUBLIC_` values are bundled at build time.

## Firebase console and social providers

1. Enable Email/Password in Authentication → Sign-in method.
2. Enable Google and select a support email.
3. Enable Twitter for X sign-in and enter the X developer app API key/secret in Firebase, not in browser code.
4. Enable Facebook and enter the Meta developer app ID/secret in Firebase. This is Facebook Login; it is not an Instagram or standalone Meta-account login provider.
5. Add the callback URI shown by Firebase (usually `https://YOUR_PROJECT.firebaseapp.com/__/auth/handler`) to the X and Facebook developer app settings. Complete provider app review/live-mode requirements when launching.
6. Add `localhost` and your real hostnames under Authentication → Settings → Authorized domains. New projects may not include localhost automatically.
7. Set the Firebase password policy to minimum 10 characters with uppercase, lowercase, numeric and non-alphanumeric requirements. This enforces the policy even when someone calls Firebase APIs directly.
8. Enable email-enumeration protection. Configure email templates/support branding.
9. Set the email template custom action URL to `APP_URL/auth/action` for the supplied reset/verification/change-email handlers, or retain Firebase's hosted action pages. Firebase appends its action code; never manually construct one.
10. Test Google, X, and Facebook with provider-approved test accounts on an authorized domain. Allow the popup when the browser asks. If a provider doesn't supply an email (common with X), verification asks for one before granting app access.

Official references:
- [Firebase session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies)
- [Managing users and email actions](https://firebase.google.com/docs/auth/web/manage-users)
- [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin)
- [X / Twitter sign-in](https://firebase.google.com/docs/auth/web/twitter-login)
- [Facebook Login](https://firebase.google.com/docs/auth/web/facebook-login)
- [MongoDB connections](https://www.mongodb.com/docs/drivers/node/current/connect/)

## Provision the requested development accounts

The accounts are not created until valid credentials are present and the seed succeeds.

1. Use a separate development Firebase project and MongoDB database.
2. Set `ENABLE_TEST_ACCOUNTS=true`, `NEXT_PUBLIC_ENABLE_TEST_ACCOUNTS=true`, and the matching `FIREBASE_TEST_PROJECT_ID`.
3. The requested passwords are already in ignored `.env.local`, never in the client or tracked seed script.
4. Run `npm run seed:test-users -- --check` to check that required variables are present (this does not prove the credentials work).
5. Run `npm run seed:test-users` to create/update:

| Username alias | Firebase email | Role |
| --- | --- | --- |
| `user1-Admin` or `user1` | `user1@buzz.test` | `admin` |
| `User2-SubAdmin` or `user2` | `user2@buzz.test` | `subadmin` |

The emails are deliberately fictional and cannot receive reset/verification messages. The seed explicitly marks these test identities verified and assigns a synthetic adult birthday. This exception exists only in the server-side seed, not in public signup. To test email delivery, use addresses you control and seed a development project.

The seed is repeatable, refuses unrelated accounts that own a matching email/UID, never logs passwords, and refuses `NODE_ENV=production`. It resets the named test account passwords to the configured values and revokes previous sessions. Disable test accounts and remove these passwords before any production launch; set both test-account flags to false. Test accounts cannot sign in when the server flag is false.

## Verification

- `npm run test:auth`: exact eighteenth birthday, underage/future/invalid dates, leap-day boundary, redirect allowlist, password and handle constraints.
- `npm run lint`
- `npx tsc --noEmit`
- Live tests after configuration: signup → verify → login; recovery → reset; social first-login → setup → verify; duplicate handles; logout all devices; Admin vs SubAdmin identity isolation; denied session for missing profile, underage profile, unverified email, disabled account, or disabled test account.

Without configuration, auth pages render with a setup notice, buttons are unavailable, protected routes redirect to `/login`, and authentication APIs fail closed. No placeholder key or hardcoded test login bypass is used.

## Current boundaries

MFA enrollment, passkeys, SMS authentication, account deletion/deactivation, real chat transport, notification delivery, live maps, and moderation remain future work. Their existing settings remain labeled as not connected. Admin/SubAdmin roles are real server-side role data, but privileged admin product features have not been invented; use `requireRole` when adding them.