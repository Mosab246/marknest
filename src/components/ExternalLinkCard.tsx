import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openExternalUrl } from "@/lib/api";
import { normalizeDisplayUrl } from "@/lib/captureText";
import { getFaviconUrl } from "@/lib/itemDisplay";
import { cn } from "@/lib/utils";

interface ExternalLinkCardProps {
  url: string;
  title?: string | null;
  domain?: string;
  className?: string;
}

export function ExternalLinkCard({
  url,
  title,
  domain,
  className,
}: ExternalLinkCardProps) {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const displayDomain = domain || normalizeDisplayUrl(trimmed).split("/")[0];
  const label = title?.trim() || normalizeDisplayUrl(trimmed);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border/70 bg-background/50 p-3",
        className,
      )}
    >
      <img
        src={getFaviconUrl(trimmed)}
        alt=""
        className="mt-0.5 h-5 w-5 shrink-0 rounded-sm"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {displayDomain}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug">{label}</p>
        <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
          {trimmed}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 shrink-0 text-xs"
        onClick={() => void openExternalUrl(trimmed).catch(() => {})}
      >
        <ExternalLink className="mr-1 h-3.5 w-3.5" />
        Open
      </Button>
    </div>
  );
}
