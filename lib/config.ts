export const APP_CONFIG = {
  basePriceTokens: Number(process.env.NEXT_PUBLIC_BASE_PRICE_TOKENS ?? 10_000),
  durationSeconds: Number(process.env.NEXT_PUBLIC_DURATION_SECONDS ?? 120),
  stepSeconds: Number(process.env.NEXT_PUBLIC_STEP_SECONDS ?? 10),
  maxMultiplier: Number(process.env.NEXT_PUBLIC_MAX_MULTIPLIER ?? 2),
  tokenMint: process.env.NEXT_PUBLIC_SPL_TOKEN_MINT ?? "",
  tokenDecimals: Number(process.env.NEXT_PUBLIC_SPL_TOKEN_DECIMALS ?? 6),
  treasuryWallet: process.env.NEXT_PUBLIC_TREASURY_WALLET ?? "",
  supabaseBucket: process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? "billboard-images",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "",
  network: process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "mainnet-beta"
};

export const isCoreConfigReady =
  APP_CONFIG.tokenMint.length > 0 &&
  APP_CONFIG.treasuryWallet.length > 0 &&
  APP_CONFIG.rpcUrl.length > 0;
