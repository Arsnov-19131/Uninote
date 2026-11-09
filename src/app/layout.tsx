import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Newsreader } from "next/font/google";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

// Fonts are downloaded at build time and served from this site, so they also work offline.
const sans = Bricolage_Grotesque({ subsets: ["latin"], display: "swap", variable: "--font-bricolage" });
const heading = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", variable: "--font-newsreader" });

export const metadata: Metadata = {
  title: "Uninote",
  description:
    "Organise subjects, plan work, learn from AI-explained notes, quiz yourself and track your readiness.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#13141f" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${heading.variable}`}>
      <body className="min-h-screen antialiased">
        {/* Applies the saved/system theme before first paint, so there's no
            light-then-dark flash. Must stay in sync with src/lib/theme.ts. */}
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_INIT_SCRIPT,
          }}
        />
        {children}
      </body>
    </html>
  );
}
