import type { Metadata } from "next";
import { Bungee, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { Toaster } from "sonner";
import { AppProviders } from "@/components/app-providers";

const bungee = Bungee({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display"
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "PumpAuctions",
  description: "PumpAuctions - King of the Billboard on Solana"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bungee.variable} ${spaceGrotesk.variable} min-h-screen bg-ink text-white antialiased`}>
        <AppProviders>
          {children}
          <Toaster position="top-center" richColors />
        </AppProviders>
      </body>
    </html>
  );
}
