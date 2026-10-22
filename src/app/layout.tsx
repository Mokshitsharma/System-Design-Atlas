import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const source = Source_Sans_3({ subsets: ["latin"], variable: "--font-source", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-plex-mono", display: "swap", weight: ["400", "500"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "System Design Atlas", template: "%s | System Design Atlas" },
  description: "Learn system design step by step, with clear explanations and interactive workflow diagrams of real-world platforms.",
  openGraph: { type: "website", siteName: "System Design Atlas" },
};

export const viewport: Viewport = { themeColor: "#FFFFFF" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${source.variable} ${plexMono.variable}`}>
      <body>
        <SiteHeader />
        <main id="main" tabIndex={-1} className="outline-none">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
