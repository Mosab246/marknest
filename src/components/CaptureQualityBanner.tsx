import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openExternalUrl } from "@/lib/api";
import { qualityLabel, shouldShowQualityWarning } from "@/lib/captureQuality";
import type { BookmarkWithRelations } from "@/lib/types";

interface CaptureQualityBannerProps {
  bookmark: BookmarkWithRelations;
}

export function CaptureQualityBanner({ bookmark }: CaptureQualityBannerProps) {
  if (!shouldShowQualityWarning(bookmark.captureQuality)) return null;

  const warning =
    bookmark.captureWarning?.trim() ||
    "This capture may be incomplete or include extra page noise. Re-capture from the original page using the MarkNest extension.";

  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium text-amber-100/90">
            {qualityLabel(bookmark.captureQuality)}
          </p>
          <p className="text-xs leading-relaxed text-amber-100/70">{warning}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 border-amber-500/30 text-xs"
              onClick={() => openExternalUrl(bookmark.url)}
            >
              <ExternalLink className="mr-1 h-3 w-3" />
              Open original
            </Button>
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              Use the MarkNest extension on that page to re-capture.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
