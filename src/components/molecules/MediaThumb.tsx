"use client";

/**
 * One photo or document in a gallery.
 *
 * Images render inline from the API's content path; anything else gets an
 * icon and its filename, because a PDF thumbnail is a rabbit hole and the
 * name is what people recognise anyway.
 */
import { FileText, X } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import type { MediaDto } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";

export function MediaThumb({
  media,
  onOpen,
  onRemove,
  className,
}: {
  media: MediaDto;
  onOpen?: (() => void) | undefined;
  onRemove?: (() => void) | undefined;
  className?: string | undefined;
}) {
  const isImage = media.mimeType.startsWith("image/");

  return (
    <figure className={cn("group relative overflow-hidden rounded-md border bg-muted", className)}>
      {isImage ? (
        <button
          type="button"
          onClick={onOpen}
          className="block h-full w-full"
          aria-label={`Open ${media.originalName}`}
        >
          {/* A plain <img>: these are user uploads of unknown dimensions
              served from our own API, which Next's image optimiser cannot
              size ahead of time. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media.url}
            alt={media.originalName}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </button>
      ) : (
        <a
          href={media.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center"
        >
          <FileText className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <span className="line-clamp-2 text-[10px] text-muted-foreground">
            {media.originalName}
          </span>
        </a>
      )}

      {onRemove !== undefined && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          // Visible on focus as well as hover, so it can be reached by
          // keyboard and on a touch screen.
          className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
          aria-label={`Remove ${media.originalName}`}
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </figure>
  );
}
