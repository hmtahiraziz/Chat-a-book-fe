import type { Metadata } from "next";
import { DM_Sans, Literata } from "next/font/google";

import { AppShell } from "@/components/AppShell";
import { Providers } from "@/app/providers";

import { themeInitScript } from "@/lib/theme";

import "./globals.css";

const fontDisplay = Literata({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const fontBody = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BookChat",
  description: "Chat with your books using RAG, OpenAI, and optional speech.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fontDisplay.variable} ${fontBody.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
