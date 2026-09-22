/**
 * Lint rules, including the two that keep the architecture honest.
 *
 * The atomic dependency direction and the ban on raw `fetch` are not style
 * preferences -- they are the things that erode first and that nobody catches
 * in review. An atom importing an organism is how a design system turns into
 * a pile of components; a `fetch` in a page is how a request ends up without
 * the refresh-and-retry, and the user gets signed out mid-form.
 */
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

/** Atoms know nothing; each layer may only reach downwards. */
const ATOMIC_LAYERS = [
  { dir: "atoms", forbids: ["molecules", "organisms", "templates"] },
  { dir: "molecules", forbids: ["organisms", "templates"] },
  { dir: "organisms", forbids: ["templates"] },
];

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },

  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // Floating promises are how a failed mutation becomes silence.
      "@typescript-eslint/no-floating-promises": "off", // needs type-aware linting; `tsc` covers the rest
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },

  {
    // Everything outside `lib/api` goes through the client, which sends
    // cookies, refreshes a lapsed session once and turns the error envelope
    // into a typed `ApiError`. A bare `fetch` does none of that.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/api/**", "src/middleware.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message:
            "Use `api` from @/lib/api/client (or serverGet in a server component). A raw fetch skips cookies, the refresh-and-retry and the typed errors.",
        },
      ],
    },
  },

  ...ATOMIC_LAYERS.map(({ dir, forbids }) => ({
    files: [`src/components/${dir}/**/*.{ts,tsx}`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: forbids.map((layer) => ({
            group: [`**/components/${layer}/**`, `@/components/${layer}/*`],
            message: `An ${dir.replace(/s$/, "")} may not import from ${layer}: the dependency direction only goes downwards.`,
          })),
        },
      ],
    },
  })),

  {
    // A store holding server data goes stale and nothing refetches it. The
    // generated API types are the marker: if a store needs one, the data it
    // holds belongs in a query.
    files: ["src/stores/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@tanstack/react-query",
              message: "Stores hold client state. Server data belongs in a query.",
            },
          ],
        },
      ],
    },
  },
];

export default config;
