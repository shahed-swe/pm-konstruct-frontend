/**
 * Hex to the bare HSL triple the tokens are written in.
 *
 * Ported from the legacy `contexts/branding.tsx` rather than rewritten: the
 * companies already using the product picked their colours by looking at the
 * result, so rounding a hue differently would visibly change screens people
 * signed off on. `tests/hex.test.ts` diffs this against the original for
 * every colour that can be written in six hex digits' worth of edge cases.
 */
export function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * The same six-digit test the legacy applied before touching a variable.
 *
 * The API validates too, but this runs on whatever the server sent, and a
 * malformed value must leave the token alone rather than write garbage into
 * the stylesheet.
 */
export const HEX6 = /^#[0-9A-Fa-f]{6}$/;

export function isHex6(value: string): boolean {
  return HEX6.test(value);
}
