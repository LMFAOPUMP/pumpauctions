# PumpAuctions - Complete Setup

This guide sets up the PumpAuctions DApp (direct SPL token buy, live image updates, decreasing price mechanic) using Next.js, Supabase, and Solana Wallet Adapter.

## 1. Prerequisites

- Node.js 20+
- npm 10+
- A Solana wallet (Phantom or Solflare)
- An existing SPL token mint
- A treasury wallet public address that receives tokens
- A Supabase project

Optional but recommended:

- Solana CLI
- SPL Token CLI

## 2. Install the project

Run in the workspace root:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env.local
```

## 3. Configure Supabase (Database + Realtime + Storage)

1. Create a Supabase project.
2. Open SQL Editor.
3. Run [supabase/schema.sql](supabase/schema.sql).

This script automatically creates:

- `public.billboard_history` table
- Indexes and constraints
- RLS and public read/insert policies
- Realtime publication for billboard events
- `billboard-images` storage bucket
- Public read/upload storage policies

## 4. Environment variables

Fill your `.env.local` file:

```env
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta

NEXT_PUBLIC_SPL_TOKEN_MINT=REPLACE_WITH_SPL_TOKEN_MINT
NEXT_PUBLIC_SPL_TOKEN_DECIMALS=6
NEXT_PUBLIC_TREASURY_WALLET=REPLACE_WITH_TREASURY_WALLET

NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=REPLACE_WITH_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_BUCKET=billboard-images

NEXT_PUBLIC_BASE_PRICE_TOKENS=10000
NEXT_PUBLIC_DURATION_SECONDS=120
NEXT_PUBLIC_STEP_SECONDS=10
NEXT_PUBLIC_MAX_MULTIPLIER=2
```

## 5. Configure the treasury SPL token account

The frontend transfers SPL tokens directly to the treasury token account.

Important: the treasury associated token account should exist before first buys.

CLI example:

```bash
solana config set --url mainnet-beta
spl-token create-account <SPL_TOKEN_MINT> --owner <TREASURY_WALLET>
```

Check treasury token account address:

```bash
spl-token address --token <SPL_TOKEN_MINT> --owner <TREASURY_WALLET>
```

## 6. Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## 7. Pricing logic implemented

- Floor price = `10000` tokens
- Max price = `20000` tokens (2x)
- Cycle duration = `120s`
- Decrease step every `10s`
- Formula implemented in [lib/pricing.ts](lib/pricing.ts)

```ts
currentPrice = maxPrice - ((maxPrice - basePrice) / 12) * Math.floor(secondsElapsed / 10)
```

- After 120 seconds, price stays at floor until the next buyer.
- New king changes are broadcast in real time via Supabase Realtime.

## 8. Buy function: handleBuySpot

Implemented in [app/page.tsx](app/page.tsx).

Pipeline:

1. Upload image to Supabase Storage
2. Compute live price at click time
3. Build SPL token transfer transaction
4. Sign and send with Phantom/Solflare
5. Confirm on chain
6. Insert row into `billboard_history`
7. Broadcast update to all connected clients

## 9. Production notes

- This version enforces direct wallet-to-treasury transfers with no escrow contract.
- For anti-fraud hardening, add server-side signature validation before DB insert.
- For analytics, add aggregated stats tables (unique wallets, volume, top kings).
