import { clusterApiUrl, Connection } from "@solana/web3.js";

export function getConnection(rpcUrl?: string, network = "mainnet-beta") {
  const endpoint = rpcUrl || clusterApiUrl(network as "mainnet-beta" | "devnet" | "testnet");
  return new Connection(endpoint, { commitment: "confirmed" });
}

export function toRawTokenAmount(tokens: number, decimals: number): bigint {
  const scaled = Math.round(tokens * 10 ** decimals);
  return BigInt(scaled);
}

export function shortenWallet(wallet?: string | null): string {
  if (!wallet) {
    return "unknown";
  }

  if (wallet.length <= 10) {
    return wallet;
  }

  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}
