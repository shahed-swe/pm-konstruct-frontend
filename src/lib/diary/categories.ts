/**
 * The categories a diary note can be filed under.
 *
 * The seven the diary form offers, in the order it offers them. `eto` and
 * `property-inspection` are also valid on the API but are written by their
 * own features, never chosen by hand here.
 *
 * Companies rename these -- one calls "Site conditions" "Ground conditions"
 * -- so the label is a default, not the truth. See `useCategoryLabels`.
 */
export const DIARY_SECTIONS = [
  {
    key: "general",
    label: "General notes",
    placeholder: "Anything else worth recording…",
  },
  {
    key: "client",
    label: "Client meetings",
    placeholder: "e.g. Client requested a tile change; engineer approved the footing depth…",
  },
  {
    key: "trades",
    label: "Trades on site",
    placeholder: "e.g. Electricians, plumbers, scaffolders, bricklayers…",
  },
  {
    key: "site_conditions",
    label: "Site conditions",
    placeholder: "e.g. Ground wet, access restricted to the north side…",
  },
  {
    key: "materials",
    label: "Materials delivered",
    placeholder: "What arrived, how much, and from whom…",
  },
  {
    key: "issues",
    label: "Delays and issues",
    placeholder: "e.g. Concrete delivery two hours late; crane breakdown stopped level 3…",
  },
  {
    key: "safety",
    label: "Safety notes",
    placeholder: "e.g. Morning toolbox talk; near miss at the stairwell…",
  },
] as const;

export type SectionKey = (typeof DIARY_SECTIONS)[number]["key"];

/** Categories that appear on a note but are never chosen by hand. */
const EXTRA_LABELS: Record<string, string> = {
  eto: "Extension of time",
  "property-inspection": "Property inspection",
};

export function categoryLabel(key: string): string {
  const section = DIARY_SECTIONS.find((s) => s.key === key);
  return section?.label ?? EXTRA_LABELS[key] ?? key;
}
