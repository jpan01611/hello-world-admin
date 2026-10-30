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
- Operations workspace for prompt chains, chain steps/mix, terms, generation requests, AI examples, LLM providers/models/responses, and signup allowlists
- Responsive dense admin tables, detail pages, loading states, and recoverable error UI
- Administrator-focused sign-in experience with branded Google OAuth entry point

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file to `.env.local` and provide the Supabase and Gemini values:

   ```bash
   cp .env.example .env.local
   ```

3. Apply the Supabase migrations in `supabase/migrations/` to the target project. Migration `0022_admin_operations.sql` adds the prompt, generation, LLM, and signup-control resources; `0023_seed_prompt_chain.sql` adds the default caption chain; `0024_seed_gemini_llm.sql` seeds Gemini; `0026_capture_caption_operations.sql` records generation history; `0027_llm_provider_secret_reference.sql` adds server-secret indirection; and `0028_llm_generation_steps.sql` adds editable vision/caption step configuration.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

The application expects the Supabase OAuth provider and redirect allowlist to be configured for the deployed application URL. Keep `.env.local` private; it is excluded by `.gitignore`.

LLM provider/model records and generation-step rows are shared live configuration consumed by both this admin app and the user-facing frontend. API keys remain deployment-local server secrets such as `GEMINI_API_KEY` and `OPENAI_API_KEY`; `secret_env_var` stores only the variable name and never a key.

The admin Operations workspace controls active providers, models, prompts, limits, and optional per-step model overrides. The frontend reads the same Supabase configuration server-side and falls back through eligible active providers. Keep the corresponding provider secrets configured in each deployment that can generate captions.

## Verification

```bash
npm run lint
npm run build
```

Lint currently reports only non-blocking image optimization and PostCSS style warnings.

## Changelog

### 2026-10-19

- Refined admin sign-in branding and administrator-focused copy.
- Added compact responsive table styling, especially for AI media.
- Preserved owner caption deletion actions for regular users.
- Protected superadmins from revoking their own access and hid only their own toggle.
- Verified lint, production build, and `/` plus `/login` smoke checks.

### Earlier

- Added the Next.js/Supabase admin console, Google OAuth, protected routes, user and media management, ratings review, AI caption generation, filtering, and responsive layouts.
