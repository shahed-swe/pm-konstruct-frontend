import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names, with later Tailwind utilities winning over earlier ones.
 *
 * Without the merge, `cn("p-2", "p-4")` emits both and the winner depends on
 * the order Tailwind happened to write them into the stylesheet.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
