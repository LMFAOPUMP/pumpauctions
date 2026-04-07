"use client";

import { ComponentType, ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { APP_CONFIG } from "@/lib/config";

type AppProvidersProps = {
  children: ReactNode;
};

type ConnectionProviderPropsLike = {
  endpoint: string;
  children: ReactNode;
};

type WalletProviderPropsLike = {
  wallets: unknown[];
  autoConnect?: boolean;
  children: ReactNode;
};

type WalletModalProviderPropsLike = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const endpoint =
    APP_CONFIG.rpcUrl ||
    clusterApiUrl(
      APP_CONFIG.network === "devnet" || APP_CONFIG.network === "testnet"
        ? (APP_CONFIG.network as "devnet" | "testnet")
        : "mainnet-beta"
    );

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  // Wallet adapter packages can pull mixed React type definitions.
  // Casting avoids false-positive JSX typing errors while preserving runtime behavior.
  const SafeConnectionProvider =
    ConnectionProvider as unknown as ComponentType<ConnectionProviderPropsLike>;
  const SafeWalletProvider =
    WalletProvider as unknown as ComponentType<WalletProviderPropsLike>;
  const SafeWalletModalProvider =
    WalletModalProvider as unknown as ComponentType<WalletModalProviderPropsLike>;

  return (
    <SafeConnectionProvider endpoint={endpoint}>
      <SafeWalletProvider wallets={wallets} autoConnect>
        <SafeWalletModalProvider>{children}</SafeWalletModalProvider>
      </SafeWalletProvider>
    </SafeConnectionProvider>
  );
}
