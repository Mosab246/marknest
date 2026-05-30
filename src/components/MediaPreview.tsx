import { useState } from "react";
import { ExternalLink, ImageOff, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { openExternalUrl } from "@/lib/api";
import { isPlayableVideoUrl } from "@/lib/mediaUrl";
import { cn } from "@/lib/utils";

interface MediaPreviewProps {
  imageUrl?: string | null;
  videoUrl?: string | null;
  fallbackPageUrl?: string | null;
  alt?: string;
  className?: string;
}

export function MediaPreview({
  imageUrl,
  videoUrl,
  fallbackPageUrl,
  alt = "",
  className,
}: MediaPreviewProps) {
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  const video = videoUrl?.trim() || "";
  const poster = imageUrl?.trim() || "";
  const showVideo = isPlayableVideoUrl(video) && !failed;

  if (!showVideo && !poster) return null;

  const openPage = () => {
    if (fallbackPageUrl?.trim()) {
      void openExternalUrl(fallbackPageUrl.trim()).catch(() => {});
    }
  };

  const openVideo = () => {
    if (video) void openExternalUrl(video).catch(() => {});
  };

  if (failed && isPlayableVideoUrl(video)) {
    return (
      <div
        className={cn(
          "space-y-2 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-4 text-xs text-muted-foreground",
          className,
        )}
      >
        <p>Video could not be loaded in MarkNest. Open it on X instead.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={openVideo}>
            <Video className="mr-1 h-3 w-3" />
            Open video
          </Button>
          {fallbackPageUrl && (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={openPage}>
              <ExternalLink className="mr-1 h-3 w-3" />
              Open original on X
            </Button>
          )}
        </div>
        {poster && !isPlayableVideoUrl(poster) && (
          <img src={poster} alt={alt} className="max-h-40 w-full rounded object-contain opacity-80" />
        )}
      </div>
    );
  }

  if (failed && !showVideo) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-6 text-xs text-muted-foreground",
          className,
        )}
      >
        <ImageOff className="h-4 w-4 shrink-0" />
        <span>Media unavailable</span>
        {poster && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => void openExternalUrl(poster).catch(() => {})}
          >
            Open URL
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={cn("space-y-2", className)}>
        {showVideo ? (
          <video
            key={video}
            src={video}
            poster={poster || undefined}
            controls
            playsInline
            preload="metadata"
            className="max-h-80 w-full rounded-lg border border-border/60 bg-black object-contain"
            onError={() => setFailed(true)}
          />
        ) : (
          <button
            type="button"
            className="block w-full overflow-hidden rounded-lg border border-border/60 text-left transition-opacity hover:opacity-95"
            onClick={() => setOpen(true)}
          >
            <img
              src={poster}
              alt={alt}
              className="max-h-72 w-full object-contain bg-muted/10"
              onError={() => setFailed(true)}
            />
          </button>
        )}
        {showVideo && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={openVideo}>
              Open video in browser
            </Button>
            {fallbackPageUrl && (
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={openPage}>
                Open original on X
              </Button>
            )}
          </div>
        )}
      </div>

      {!showVideo && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl sm:max-w-2xl" showCloseButton>
            <DialogHeader>
              <DialogTitle>Image preview</DialogTitle>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-auto">
              <img
                src={poster}
                alt={alt}
                className="mx-auto max-h-[65vh] w-full object-contain"
                onError={() => setFailed(true)}
              />
            </div>
            <DialogFooter showCloseButton>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void openExternalUrl(poster).catch(() => {})}
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open in browser
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
