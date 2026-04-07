"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { WalletConnectButton } from "@/components/wallet-connect-button";
import { APP_CONFIG, isCoreConfigReady } from "@/lib/config";
import { getCycleProgress, getCurrentPrice } from "@/lib/pricing";
import { getConnection, shortenWallet } from "@/lib/solana";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { BillboardRow } from "@/lib/types";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

function formatTokens(value: number | string) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

export default function HomePage() {
  const { connected, publicKey, sendTransaction } = useWallet();
  const connection = useMemo(
    () => getConnection(APP_CONFIG.rpcUrl, APP_CONFIG.network),
    []
  );

  const [nowTs, setNowTs] = useState(Date.now());
  const [currentSpot, setCurrentSpot] = useState<BillboardRow | null>(null);
  const [recentKings, setRecentKings] = useState<BillboardRow[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isBuying, setIsBuying] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      return;
    }

    let active = true;

    const loadHistory = async () => {
      const { data, error } = await supabase
        .from("billboard_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(16);

      if (error) {
        toast.error(`Failed to load history: ${error.message}`);
        return;
      }

      if (!active) {
        return;
      }

      const rows = (data ?? []) as BillboardRow[];
      setRecentKings(rows);
      setCurrentSpot(rows[0] ?? null);
    };

    void loadHistory();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      return;
    }

    const channel = supabase
      .channel("pumpauctions-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "billboard_history"
        },
        (payload) => {
          const row = payload.new as BillboardRow;
          setCurrentSpot(row);
          setRecentKings((prev) => [row, ...prev.filter((item) => item.id !== row.id)].slice(0, 16));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const secondsElapsed = useMemo(() => {
    if (!currentSpot) {
      return APP_CONFIG.durationSeconds;
    }

    const displayedFrom = new Date(currentSpot.displayed_from || currentSpot.created_at).getTime();
    return Math.max(0, Math.floor((nowTs - displayedFrom) / 1000));
  }, [currentSpot, nowTs]);

  const currentPrice = useMemo(
    () =>
      getCurrentPrice({
        secondsElapsed,
        basePrice: APP_CONFIG.basePriceTokens,
        maxMultiplier: APP_CONFIG.maxMultiplier,
        durationSeconds: APP_CONFIG.durationSeconds,
        stepSeconds: APP_CONFIG.stepSeconds
      }),
    [secondsElapsed]
  );

  const progressRatio = useMemo(
    () => getCycleProgress(secondsElapsed, APP_CONFIG.durationSeconds),
    [secondsElapsed]
  );

  const isFloorPrice = secondsElapsed >= APP_CONFIG.durationSeconds;

  const tokenHeadline = useMemo(() => {
    const mint = APP_CONFIG.tokenMint?.trim();
    if (!mint) {
      return "PUMP AUCTIONS";
    }

    const lower = mint.toLowerCase();
    if (lower.endsWith("pump")) {
      return "PUMP AUCTIONS";
    }

    return "PUMP AUCTIONS";
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image too large. Maximum is 8MB.");
      return;
    }

    const url = URL.createObjectURL(file);

    setPreviewUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }

      return url;
    });

    setSelectedFile(file);
  };

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl]
  );

  const uploadImage = async (file: File, walletAddress: string) => {
    const extension = file.name.split(".").pop() ?? "png";
    const path = `${walletAddress}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(APP_CONFIG.supabaseBucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(APP_CONFIG.supabaseBucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleBuySpot = async () => {
    if (!connected || !publicKey) {
      toast.error("Connect your wallet before buying.");
      return;
    }

    if (!selectedFile) {
      toast.error("Upload an image first.");
      return;
    }

    if (!hasSupabaseConfig) {
      toast.error("Missing Supabase configuration.");
      return;
    }

    if (!isCoreConfigReady) {
      toast.error("Missing Solana configuration.");
      return;
    }

    const clickPrice = getCurrentPrice({
      secondsElapsed,
      basePrice: APP_CONFIG.basePriceTokens,
      maxMultiplier: APP_CONFIG.maxMultiplier,
      durationSeconds: APP_CONFIG.durationSeconds,
      stepSeconds: APP_CONFIG.stepSeconds
    });

    setIsBuying(true);

    try {
      const imageUrl = await uploadImage(selectedFile, publicKey.toBase58());

      const mintAddress = new PublicKey(APP_CONFIG.tokenMint);
      const treasuryWallet = new PublicKey(APP_CONFIG.treasuryWallet);
      console.log("[PumpAuctions] buyer wallet:", publicKey.toBase58());
      console.log("[PumpAuctions] token mint:", mintAddress.toBase58());

      const mintAccountInfo = await connection.getAccountInfo(mintAddress, "confirmed");
      if (!mintAccountInfo) {
        throw new Error("Mint account not found on-chain.");
      }

      const tokenProgramId = mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID;

      console.log("[PumpAuctions] token program:", tokenProgramId.toBase58());

      const payerTokenAccount = getAssociatedTokenAddressSync(
        mintAddress,
        publicKey,
        false,
        tokenProgramId,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      const treasuryTokenAccount = getAssociatedTokenAddressSync(
        mintAddress,
        treasuryWallet,
        false,
        tokenProgramId,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const [payerAtaInfo, treasuryAtaInfo] = await Promise.all([
        connection.getAccountInfo(payerTokenAccount),
        connection.getAccountInfo(treasuryTokenAccount)
      ]);

      const scaledAmount = Math.round(clickPrice * Math.pow(10, APP_CONFIG.tokenDecimals));
      const amountRaw = BigInt(scaledAmount);

      const transferTx = new Transaction();

      try {
        if (!payerAtaInfo) {
          transferTx.add(
            createAssociatedTokenAccountInstruction(
              publicKey,
              payerTokenAccount,
              publicKey,
              mintAddress,
              tokenProgramId,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }

        if (!treasuryAtaInfo) {
          transferTx.add(
            createAssociatedTokenAccountInstruction(
              publicKey,
              treasuryTokenAccount,
              treasuryWallet,
              mintAddress,
              tokenProgramId,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }
      } catch (ataInstructionError) {
        console.warn("[PumpAuctions] ATA create instruction setup warning:", ataInstructionError);
      }

      transferTx.add(
        createTransferCheckedInstruction(
          payerTokenAccount,
          mintAddress,
          treasuryTokenAccount,
          publicKey,
          amountRaw,
          APP_CONFIG.tokenDecimals,
          [],
          tokenProgramId
        )
      );

      const signature = await sendTransaction(transferTx, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 3
      });

      await connection.confirmTransaction(signature, "confirmed");

      const { error: insertError } = await supabase.from("billboard_history").insert({
        buyer_wallet: publicKey.toBase58(),
        image_url: imageUrl,
        tx_signature: signature,
        paid_amount_tokens: clickPrice,
        paid_amount_raw: amountRaw.toString(),
        displayed_from: new Date().toISOString()
      });

      if (insertError) {
        throw new Error(
          `Transaction confirmed (${signature}) but Supabase insert failed: ${insertError.message}`
        );
      }

      setSelectedFile(null);
      setPreviewUrl((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }

        return null;
      });

      toast.success("You got the spot. The billboard is now yours.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(message);
    } finally {
      setIsBuying(false);
    }
  };

  const missingConfigMessages = [
    !APP_CONFIG.rpcUrl && "NEXT_PUBLIC_RPC_URL",
    !APP_CONFIG.tokenMint && "NEXT_PUBLIC_SPL_TOKEN_MINT",
    !APP_CONFIG.treasuryWallet && "NEXT_PUBLIC_TREASURY_WALLET",
    !process.env.NEXT_PUBLIC_SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  ].filter(Boolean) as string[];

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-12 pt-6 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 neon-grid opacity-20" />

      <div className="pointer-events-none absolute left-[8%] top-[16%] h-36 w-36 rounded-full bg-neonPink/35 blur-3xl sm:h-52 sm:w-52" />
      <div className="pointer-events-none absolute right-[10%] top-[24%] h-40 w-40 animate-floatDrift rounded-full bg-neonCyan/35 blur-3xl sm:h-60 sm:w-60" />
      <div className="pointer-events-none absolute bottom-[6%] left-[42%] h-44 w-44 rounded-full bg-neonYellow/30 blur-3xl sm:h-64 sm:w-64" />

      <div className="relative mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative z-40 flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-neonCyan/90">PumpAuctions</p>
            <h1 className="neon-display text-2xl text-white sm:text-3xl lg:text-4xl">King of the Billboard on Solana</h1>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              LIVE
            </div>
          </div>
          <WalletConnectButton />
        </header>

        {missingConfigMessages.length > 0 && (
          <div className="rounded-xl border border-red-300/40 bg-red-900/30 px-4 py-3 text-sm text-red-100">
            Missing variables: {missingConfigMessages.join(", ")}. Check SETUP.md before buying.
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[2.35fr_0.95fr]">
          <motion.div
            className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-md sm:p-6 lg:p-8"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-neonCyan/40 bg-black/20 shadow-[0_0_15px_rgba(0,255,255,0.15)] sm:h-20 sm:w-20 lg:h-24 lg:w-24">
                  {/* Token logo: mets ton image 'logo.png' dans le dossier 'public/' */}
                  <img 
                    src="/logo.png" 
                    alt="Logo Pump Auctions" 
                    className="h-full w-full object-cover" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="absolute text-[10px] uppercase tracking-wider text-neonCyan/50 sm:text-xs">Logo</span>
                </div>
                <div>
                  <p className="mb-2 text-sm uppercase tracking-[0.25em] text-white/70">Featured Token</p>
                  <p className="neon-display text-[2.8rem] leading-[0.9] text-neonCyan sm:text-[4rem] lg:text-[5.5rem] xl:text-[6.5rem]">
                    {tokenHeadline}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <p className="text-xs uppercase tracking-[0.2em] text-neonYellow">Live Billboard</p>
                <p className="text-sm text-white/80">
                  {isFloorPrice
                    ? "Floor price is active"
                    : `Price drops in ${APP_CONFIG.stepSeconds - (secondsElapsed % APP_CONFIG.stepSeconds)}s`}
                </p>
              </div>
            </div>

            <div className="king-card-glow relative min-h-[45vh] overflow-hidden rounded-2xl border border-neonCyan/50 bg-sky-900/30 p-[2px] sm:min-h-[52vh] lg:min-h-[62vh] xl:min-h-[68vh]">
              <div className="relative h-full w-full overflow-hidden rounded-2xl bg-slate-950/50">
                {currentSpot ? (
                  <img
                    src={currentSpot.image_url}
                    alt="Current billboard"
                    className="h-full min-h-[45vh] w-full object-cover sm:min-h-[52vh] lg:min-h-[62vh] xl:min-h-[68vh]"
                  />
                ) : (
                  <div className="flex h-full min-h-[45vh] w-full flex-col items-center justify-center bg-gradient-to-br from-[#3d1456] via-[#143b63] to-[#5b3310] text-center text-white/85 sm:min-h-[52vh] lg:min-h-[62vh] xl:min-h-[68vh]">
                    <p className="neon-display text-3xl text-neonCyan sm:text-4xl">YOUR ART HERE</p>
                    <p className="mt-2 text-sm text-white/80">Be the first to claim the crown.</p>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4">
                  {currentSpot ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                      <p>
                        Current king: <span className="font-semibold text-neonGreen">{shortenWallet(currentSpot.buyer_wallet)}</span>
                      </p>
                      <p className="text-neonYellow">{formatTokens(currentSpot.paid_amount_tokens)} TOKENS</p>
                    </div>
                  ) : (
                    <p className="text-sm text-neonCyan">No king yet. Drop your first take.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">Current Price</p>
                  <p className="neon-display text-3xl text-neonYellow sm:text-4xl">
                    {formatTokens(currentPrice)} TOKENS
                  </p>
                </div>
                <p className="text-xs text-white/70">Floor: {formatTokens(APP_CONFIG.basePriceTokens)} TOKENS</p>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-neonPink via-neonYellow to-neonGreen"
                  animate={{ width: `${Math.max(2, (1 - progressRatio) * 100)}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          </motion.div>

          <motion.aside
            className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-md sm:p-6"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.45 }}
          >
            <h2 className="neon-display text-xl text-neonPink">Steal The Spot</h2>
            <p className="mt-1 text-sm text-white/75">
              Upload your image, sign the transaction, and take the billboard instantly.
            </p>

            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-neonCyan/60 bg-white/[0.03] p-4 text-center hover:bg-white/[0.06]">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-36 w-full rounded-xl object-cover"
                />
              ) : (
                <>
                  <p className="text-sm text-neonCyan">Click to upload your visual</p>
                  <p className="mt-1 text-xs text-white/60">PNG / JPG / WEBP, max 8MB</p>
                </>
              )}
            </label>
            <p className="mt-2 text-xs leading-relaxed text-white/70">
              Recommended format: 1:1 (example: 1080x1080px). Max 8MB (PNG, JPG, WEBP). Your image
              will be stretched to fill the billboard.
            </p>

            <motion.button
              type="button"
              onClick={handleBuySpot}
              disabled={isBuying || !connected || !selectedFile || missingConfigMessages.length > 0}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="buy-cta-glow mt-5 w-full rounded-2xl border border-neonYellow/70 bg-gradient-to-r from-neonPink/95 via-[#ff7d55] to-neonYellow/90 px-5 py-5 text-left text-black shadow-neon-strong transition disabled:cursor-not-allowed disabled:opacity-50 sm:py-6"
            >
              <p className="neon-display flex items-center gap-2 text-[1.7rem] leading-none sm:text-[2rem]">
                <span>TAKE THE CROWN</span>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-7 w-7"
                  fill="currentColor"
                >
                  <path d="M3 7.5a1 1 0 0 1 1.55-.83L9 9.75l2.22-4.07a1 1 0 0 1 1.76 0L15.2 9.75l4.45-3.08A1 1 0 0 1 21.2 7.7l-2.5 10a1 1 0 0 1-.97.76H6.27a1 1 0 0 1-.97-.76l-2.3-9.2a.99.99 0 0 1 0-.2v-.8zM7 20.5a1 1 0 1 1 0-2h10a1 1 0 1 1 0 2H7z" />
                </svg>
              </p>
              <p className="mt-2 text-base font-semibold sm:text-lg">
                {isBuying ? "Transaction in progress..." : `Buy now for ${formatTokens(currentPrice)} TOKENS`}
              </p>
            </motion.button>

            <div className="mt-6">
              <h3 className="mb-3 text-xs uppercase tracking-[0.2em] text-white/70">Recent Kings</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">
                {recentKings.slice(0, 8).map((entry) => (
                  <div
                    key={entry.id}
                    className="overflow-hidden rounded-xl border border-white/15 bg-white/[0.04]"
                    title={entry.buyer_wallet}
                  >
                    <img
                      src={entry.image_url}
                      alt={entry.buyer_wallet}
                      className="h-20 w-full object-cover"
                    />
                    <div className="px-2 py-2 text-[11px] text-white/80">
                      <p className="font-semibold text-neonGreen">{shortenWallet(entry.buyer_wallet)}</p>
                      <p>{formatTokens(entry.paid_amount_tokens)} TOKENS</p>
                    </div>
                  </div>
                ))}

                {recentKings.length === 0 && (
                  <p className="col-span-full text-sm text-white/60">No history yet.</p>
                )}
              </div>
            </div>
          </motion.aside>
        </section>
      </div>
    </main>
  );
}
