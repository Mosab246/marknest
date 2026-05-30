import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openExternalUrl } from "@/lib/api";

interface TweetEmbedPlayerProps {
  tweetId: string;
  pageUrl: string;
}

/** X embed player — works when raw MP4 URLs are blocked in the desktop webview. */
export function TweetEmbedPlayer({ tweetId, pageUrl }: TweetEmbedPlayerProps) {
  const embedUrl = `https://platform.twitter.com/embed/Tweet.html?id=${encodeURIComponent(tweetId)}&theme=dark&dnt=true`;

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-black/40">
      <iframe
        title="Embedded tweet"
        src={embedUrl}
        className="h-[min(420px,50vh)] w-full border-0"
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        loading="lazy"
      />
      <div className="flex justify-end border-t border-border/40 px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => void openExternalUrl(pageUrl).catch(() => {})}
        >
          <ExternalLink className="mr-1 h-3 w-3" />
          Open on X
        </Button>
      </div>
    </div>
  );
}
