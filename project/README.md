# QuantaPrep

**Practice. Analyse. Improve.**

QuantaPrep is a test-series website built with React, Vite, TypeScript and Tailwind CSS. It uses only Firebase Google sign-in and Cloud Firestore, so it runs on the Spark (free) plan without Cloud Functions or Storage.

## Features

- Google sign-in only, with a profile created on first login
- Categories, sub-categories, and free or premium tests
- Timed test-taking with autosave, resume after refresh, question palette, mark for review, and KaTeX math
- Results with score, rank, accuracy, section and topic charts, and explanations
- Dashboard, Quanta Revise mode for wrong questions, bookmarks, and per-test leaderboards
- Admin panel at `/admin` for categories, tests, questions (including CSV and Excel bulk upload), users, analytics, and sample data

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and fill in the `VITE_FIREBASE_*` values from your Firebase project settings.
3. Run the app locally with `npm run dev`.

Node 24.12 or newer is recommended, because the Firebase SDK declares that engine. Older versions still build, but npm prints engine warnings.

## Firebase Console setup

1. **Create the project** (or open the one you already have).
2. **Enable Google sign-in:** Authentication, then Sign-in method, then Google, then enable it and pick a support email.
3. **Add authorized domains:** Authentication, then Settings, then Authorized domains. Add `localhost` and your deployed domain.
4. **Create Firestore:** Firestore Database, then Create database. Choose production mode and a region.
5. **Publish the rules and indexes:** install the Firebase CLI, run `firebase login`, then run `firebase deploy --only firestore:rules,firestore:indexes` from the project folder.
6. **Create the admin account:** sign in once with vk1719676@gmail.com. The admin area is unlocked for that Google account by the security rules.
7. **Add sample content (optional):** open `/admin/seed` and click "Add sample data". Run it once only.

## Scripts

- `npm run dev` starts the local development server.
- `npm run build` creates a production build.
- `npm run typecheck` runs the TypeScript check.

## Project structure

- `src/pages`: student pages and `src/pages/admin` for the admin area
- `src/features/exam`: the test-taking screen and its autosave logic
- `src/services`: all Firestore reads and writes, one file per collection
- `src/lib`: types, constants, scoring, and bulk-import validation
- `src/components`: shared UI, layouts, and admin forms
- `firestore.rules` and `firestore.indexes.json`: security rules and required indexes

## Known limitations

- **Scoring runs in the browser.** Students never receive the answer key during a test, but a technically skilled student could forge a leaderboard score. Cloud Functions can add server-side scoring later for stricter security.
- **Retake answer keys.** After a student submits their first attempt, the answer key for that test becomes readable to them. This means a retake could be checked against the key during that retake. Fixing this requires a per-attempt rule check.
- **Dependency audit.** `npm audit` reports known vulnerabilities in some transitive packages. Review them before a production launch.
- **Images** can only be added by pasting an image URL. File uploads are not supported on the Spark plan.
