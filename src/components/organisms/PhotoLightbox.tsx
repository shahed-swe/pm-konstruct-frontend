"use client";

/**
 * A photo, full size, with the rest of the set behind the arrow keys.
 *
 * The current app opens photos this way and people page through a job's
 * pictures one after another. Opening each in a new tab, which is what this
 * rebuild did first, loses that entirely.
 */
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useCallback, useEffect } from "react";
import { Button } from "@/components/atoms/Button";
import type { MediaDto } from "@/lib/api/types";

export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: MediaDto[];
  index: number;
  onIndexChange: (next: number) => void;
  onClose: () => void;
}) {
  const current = photos[index];

  const step = useCallback(
    (delta: number) => {
      if (photos.length === 0) return;
      // Wraps, so the last photo's "next" is the first rather than a dead
      // end -- which is how people flick through a set.
      onIndexChange((index + delta + photos.length) % photos.length);
    },
    [index, photos.length, onIndexChange],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, onClose]);

  if (current === undefined) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current.originalName}
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
    >
      <div className="flex items-center gap-2 p-3 text-white">
        <p className="min-w-0 flex-1 truncate text-sm">
          {current.originalName}
          <span className="ml-2 text-white/60">
            {index + 1} of {photos.length}
          </span>
        </p>

        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" asChild>
          <a href={current.url} download={current.originalName} aria-label="Download this photo">
            <Download className="h-5 w-5" />
          </a>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          aria-label="Close"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-4">
        {photos.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous photo"
            className="absolute left-2 text-white hover:bg-white/10"
            onClick={() => step(-1)}
          >
            <ChevronLeft className="h-7 w-7" />
          </Button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.originalName}
          className="max-h-full max-w-full object-contain"
        />

        {photos.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next photo"
            className="absolute right-2 text-white hover:bg-white/10"
            onClick={() => step(1)}
          >
            <ChevronRight className="h-7 w-7" />
          </Button>
        )}
      </div>

      {/* Clicking the backdrop closes it, which is what people expect. */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
}
