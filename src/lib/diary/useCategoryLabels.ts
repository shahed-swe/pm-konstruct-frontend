"use client";

/**
 * A company's own names for the diary sections.
 *
 * The legacy let a user rename a section inline and kept the name in
 * `localStorage`, so it followed the person rather than the company -- two
 * supervisors on the same job could see different headings, and clearing
 * site data lost the names. It is kept here, in the same place and under a
 * compatible key, because moving it to the server is a product decision
 * about who owns the naming, not a refactor.
 *
 * Reads are wrapped: `localStorage` throws in a private window, and a
 * renamed heading is not worth a blank page.
 */
import { useCallback, useEffect, useState } from "react";
import { categoryLabel, type SectionKey } from "./categories";

const STORAGE_KEY = "pmk.diaryCategoryLabels";

type Labels = Partial<Record<string, string>>;

function read(): Labels {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === null ? {} : (JSON.parse(raw) as Labels);
  } catch {
    return {};
  }
}

export function useCategoryLabels() {
  // Empty on the first render, filled in an effect: reading storage during
  // render would make the server's HTML and the client's first paint differ.
  const [labels, setLabels] = useState<Labels>({});

  useEffect(() => {
    setLabels(read());
  }, []);

  const getLabel = useCallback(
    (key: SectionKey | string): string => labels[key] ?? categoryLabel(key),
    [labels],
  );

  const setLabel = useCallback((key: string, value: string) => {
    const trimmed = value.trim();
    setLabels((prev) => {
      const next = { ...prev };
      // An empty name means "back to the default" rather than a blank heading.
      if (trimmed === "" || trimmed === categoryLabel(key)) delete next[key];
      else next[key] = trimmed;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Private browsing. The rename lasts for this session only.
      }
      return next;
    });
  }, []);

  return { getLabel, setLabel };
}
