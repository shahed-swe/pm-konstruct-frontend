/**
 * Branding as CSS text, so it can be rendered into the document server-side.
 *
 * The legacy applied branding in an effect after `/settings/branding`
 * resolved, which meant every page painted in the default orange first and
 * then snapped to the company's colour -- visible on every navigation and
 * especially on a slow connection. Emitting the variables in the server's
 * HTML removes the flash entirely: the first paint is already correct.
 */
import type { BrandingDto } from "@/lib/api/types";
import { hexToHsl, isHex6 } from "./hex";

/**
 * The `:root` overrides for a company's branding.
 *
 * Returns an empty string when there is nothing to override, so the caller
 * can skip the `<style>` element rather than emit an empty one.
 */
export function brandingCss(branding: Pick<BrandingDto, "primaryColor" | "sidebarColor">): string {
  const declarations: string[] = [];

  if (isHex6(branding.primaryColor)) {
    const hsl = hexToHsl(branding.primaryColor);
    // `--ring` follows the primary, as the legacy did: the focus ring is the
    // brand colour, and leaving it orange on a blue site looked like a bug.
    declarations.push(`--primary: ${hsl};`, `--ring: ${hsl};`);
  }

  if (isHex6(branding.sidebarColor)) {
    const hsl = hexToHsl(branding.sidebarColor);
    declarations.push(`--sidebar: ${hsl};`);
  }

  return declarations.length === 0 ? "" : `:root{${declarations.join("")}}`;
}

/**
 * Applies branding to the live document.
 *
 * Only needed when branding changes without a navigation -- the settings
 * page saving a new colour. The server-rendered block above covers every
 * other case.
 */
export function applyBranding(branding: Pick<BrandingDto, "primaryColor" | "sidebarColor">): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (isHex6(branding.primaryColor)) {
    const hsl = hexToHsl(branding.primaryColor);
    root.style.setProperty("--primary", hsl);
    root.style.setProperty("--ring", hsl);
  }

  if (isHex6(branding.sidebarColor)) {
    root.style.setProperty("--sidebar", hexToHsl(branding.sidebarColor));
  }
}
