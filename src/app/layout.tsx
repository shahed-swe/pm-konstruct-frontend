/**
 * The document itself: fonts, tokens, branding and the client providers.
 *
 * Branding is resolved here and written into a `<style>` in the head, so the
 * first paint is already in the company's colours. The legacy applied them
 * in an effect after a fetch, which meant every page flashed the default
 * orange first -- on a slow connection, for a second or more.
 */
import type { Metadata, Viewport } from "next";
import { Inter, Chakra_Petch } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import { getBranding, getSession } from "@/lib/auth/session";
import { brandingCss } from "@/lib/branding/css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// The display face the current app uses for headings and the wordmark.
const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-chakra",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PM Konstruct",
    template: "%s · PM Konstruct",
  },
  description: "Site supervision for residential construction: jobs, diaries, call forwards and trade scheduling.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Supervisors use this on site, one-handed, in sunlight. The theme colour
  // follows the company's own, set below.
  themeColor: "#0f1117",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Both are `cache`d, so the pages below can ask again for free.
  const [session, branding] = await Promise.all([getSession(), getBranding()]);
  const css = brandingCss(branding);

  return (
    <html lang="en" className={`${inter.variable} ${chakra.variable}`}>
      <head>
        {css !== "" && <style dangerouslySetInnerHTML={{ __html: css }} />}
      </head>
      <body>
        <AppProviders session={session} branding={branding}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
