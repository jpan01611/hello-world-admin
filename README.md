# FunFunFunSahur Admin

FunFunFunSahur Admin is a separate Next.js and Supabase administration console for reviewing users, generated media, captions, votes, and feed selection. It provides authenticated admin views with responsive tables, tolerant search and filtering, dashboard activity metrics, role-aware controls, and protected media-management actions.

## Highlights

- Supabase SSR authentication with Google OAuth support
- Authenticated dashboard with overview totals and seven-day ratings activity
- User directory with name, profile ID, and access filters
- Media library with owner, caption, feed-status, score, and date filters
- Ratings review with upvote/downvote filtering
- AI media generation through the existing Gemini-compatible caption workflow
- Upload and hosted-image support with validation and cleanup handling
- Feed-caption selection and owner/superadmin authorization
- Responsive admin tables, detail pages, loading states, and recoverable error UI

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file to `.env.local` and provide the Supabase and Gemini values:

   ```bash
   cp .env.example .env.local
   ```

3. Apply the Supabase migrations in `supabase/migrations/` to the target project.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

The application expects the Supabase OAuth provider and redirect allowlist to be configured for the deployed application URL. Keep `.env.local` private; it is excluded by `.gitignore`.

## Verification

```bash
npm run lint
npm run build
```

Lint currently reports only non-blocking image optimization and PostCSS style warnings.

## Implementation log

### Foundation

- Created the standalone Next.js App Router admin application.
- Added Supabase server/client helpers, middleware session refresh, login, OAuth callback handling, and protected admin routes.
- Added the initial superadmin schema and row-level security migrations.

### Administration and permissions

- Added overview, users, media, ratings, and detail pages.
- Added `requireAuthenticated()` and `requireSuperadmin()` authorization boundaries.
- Enabled authenticated read access while keeping privileged mutations protected.
- Added superadmin access management and owner-or-superadmin media deletion.
- Added feed-caption selection based on the image-level `selected_caption_id` field.

### Media and AI workflow

- Recreated the two-stage image analysis and caption-generation flow.
- Added upload and hosted URL inputs, size/type validation, image normalization, creator context, caption overrides, and failure cleanup.
- Added media editing, deletion confirmation, additional-caption generation, previews, and visible pending/error states.

### Search, filters, and interaction

- Added tolerant keyword and partial-ID searches for users and media.
- Added owner, feed, score, access, rating, and date controls.
- Added removable filter cards and a shared “Clear filters” action.
- Fixed stale client filter state that caused removed filter cards to return.
- Preserved search text while navigation is pending and reset it after the server-rendered filter state updates.
- Added row hover/focus prefetching and keyboard-accessible table navigation.

### Dashboard and presentation

- Added the FunFunFunSahur branding throughout the admin shell and browser metadata.
- Made the profile shortcut navigate to the signed-in user’s profile.
- Added a seven-day ratings/sharing chart with aligned bars, gridlines, totals, peak activity, and a rightmost Today label.
- Added responsive layouts, dense tables, status controls, loading states, and a recoverable admin error boundary.

### Reliability checks

- Prevented incomplete UUID searches from reaching Supabase UUID comparisons.
- Added explicit Supabase error handling for dashboard, ratings, and management queries.
- Fixed stale `queryInputRef` usage in the media filter component.
- Fixed media detail and deletion-action TypeScript errors found during the final build check.
- Confirmed the production build and runtime route smoke checks pass.
