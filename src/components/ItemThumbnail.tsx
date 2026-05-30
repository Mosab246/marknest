import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  getFaviconUrl,
  getInitial,
  isTwitterUrl,
} from "@/lib/itemDisplay";
import type { BookmarkWithRelations } from "@/lib/types";

interface ItemThumbnailProps {
  bookmark: BookmarkWithRelations;
  className?: string;
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function ItemThumbnail({ bookmark, className }: ItemThumbnailProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const twitter = isTwitterUrl(bookmark.url);
  const imageSrc =
    bookmark.imageUrl?.trim() ||
    bookmark.faviconUrl?.trim() ||
    getFaviconUrl(bookmark.url);
  const initial = getInitial(bookmark);

  if (!imgFailed && imageSrc) {
    return (
      <img
        src={imageSrc}
        alt=""
        className={cn("h-8 w-8 shrink-0 rounded-md bg-muted object-cover", className)}
        onError={() => setImgFailed(true)}
      />
    );
  }

  if (twitter) {
    return (
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
          className,
        )}
      >
        <XIcon className="h-3.5 w-3.5" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/20 text-xs font-medium text-primary",
        className,
      )}
    >
      {initial}
    </div>
  );
}
