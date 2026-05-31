# Cloud Nexus AI Content Engine

Cloud Nexus AI Content Engine (CNACE) is a commerce-first AI campaign builder for ecommerce sellers, digital product creators, and freelancers. It collects a structured offer brief, runs a strategic analysis pass through OpenAI, then generates channel-specific campaign assets for TikTok/Reels, Facebook/Meta Ads, product pages, email promos, and landing pages.

## Phase 1 Features

- Landing page at `/`
- 4-step offer intake flow at `/generate`
- Strategy Brain endpoint at `/api/strategy`
- Parallel platform generation endpoint at `/api/generate`
- Results experience at `/results/[campaignId]`
- Save/load campaigns through Supabase via `/api/campaigns`
- Supabase Auth login page at `/login`
- Saved campaigns dashboard at `/dashboard`
- Commerce Score calculation and campaign export

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- OpenAI API
- Supabase PostgreSQL + Auth
- npm

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template and fill in credentials:

```bash
cp .env.example .env.local
```

Required variables:

```env
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Run the Supabase migration in `supabase/migrations/20260421_phase1.sql`.

4. Start the development server:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Database Schema

### `campaigns`

- `id uuid primary key`
- `user_id uuid nullable references auth.users`
- `offer_data jsonb`
- `strategy_brief jsonb`
- `generated_content jsonb`
- `commerce_scores jsonb`
- `created_at timestamptz`
- `title text`

### `brands`

- `id uuid primary key`
- `user_id uuid references auth.users`
- `brand_name text`
- `settings jsonb`
- `created_at timestamptz`

The `brands` table is included now for Phase 2 but has no UI yet.

## API Notes

- `/api/strategy` expects `{ offerData }`
- `/api/generate` expects `{ offerData, strategyBrief, platforms }`
- `/api/campaigns`
  - `GET /api/campaigns?id=<uuid>` loads one campaign
  - `GET /api/campaigns` with a Supabase access token loads the signed-in user dashboard
  - `POST /api/campaigns` creates a campaign or attaches an existing one to the signed-in user

## Stripe Stub

Stripe is intentionally stubbed for Phase 1. See `lib/stripe.ts` for the placeholder hook point.

## Verification

Run:

```bash
npm run lint
```
