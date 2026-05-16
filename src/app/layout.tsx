import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
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

const FAVICON_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='%23FFFFFF'/><path d='M 4 20 L 12 20 C 12 20 12 10 16 10 C 20 10 20 20 16 20 L 28 20' fill='none' stroke='%23C8102E' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/></svg>`;

export const metadata: Metadata = {
  title: "Red Thread — agentic operating system for luxury hospitality",
  description:
    "A Sense of Place, threaded through every guest. Pre-arrival, on-property, post-stay — one thread.",
  metadataBase: new URL("https://redthread.boutique"),
  icons: {
    icon: [{ url: `data:image/svg+xml,${FAVICON_SVG}`, type: "image/svg+xml" }],
  },
  openGraph: {
    title: "Red Thread",
    description: "A Sense of Place, threaded through every guest.",
    url: "https://redthread.boutique",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper-soft text-ink">{children}</body>
    </html>
  );
}
