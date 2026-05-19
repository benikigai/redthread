import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Noto_Serif_SC } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DemoLockProvider } from "@/components/DemoLock";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const notoSerifSC = Noto_Serif_SC({
  variable: "--font-noto-serif-sc",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Red Thread — agentic operating system for luxury hospitality",
  description:
    "A Sense of Place, threaded through every guest. Pre-arrival, on-property, post-stay — one thread.",
  metadataBase: new URL("https://redthread.boutique"),
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Red Thread",
    description: "A Sense of Place, threaded through every guest.",
    url: "https://redthread.boutique",
    type: "website",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} ${notoSerifSC.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper-canvas text-ink">
        <DemoLockProvider>{children}</DemoLockProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
