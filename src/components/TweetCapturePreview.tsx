import { Badge } from "@/components/ui/badge";
import { ExternalLinkCard } from "@/components/ExternalLinkCard";
import { FormattedReaderText } from "@/components/FormattedReaderText";
import { MediaPreview } from "@/components/MediaPreview";
import { TweetEmbedPlayer } from "@/components/TweetEmbedPlayer";
import {
  cleanCapturedTextForDisplay,
  getExternalLinkFromBookmark,
} from "@/lib/captureText";
import {
  getAuthorLabel,
  getDisplayTweetId,
  getTweetBodyText,
  isGenericXogImage,
  shouldShowTweetEmbed,
} from "@/lib/itemDisplay";
import { openExternalUrl } from "@/lib/api";
import type { BookmarkWithRelations } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface TweetCapturePreviewProps {
  bookmark: BookmarkWithRelations;
}

export function TweetCapturePreview({ bookmark }: TweetCapturePreviewProps) {
  const author = getAuthorLabel(bookmark);
  const handle = bookmark.authorHandle?.replace(/^@/, "");
  const body = cleanCapturedTextForDisplay(getTweetBodyText(bookmark));
  const tweetId = getDisplayTweetId(bookmark);
  const savedAt = bookmark.capturedAt || bookmark.createdAt;
  const externalLink = getExternalLinkFromBookmark(bookmark);
  const showVideoEmbed = shouldShowTweetEmbed(bookmark);
  const posterUrl =
    bookmark.imageUrl?.trim() && !isGenericXogImage(bookmark.imageUrl)
      ? bookmark.imageUrl
      : null;

  return (
    <article className="min-h-0 rounded-lg border border-border/80 bg-muted/15 p-3">
      <header className="mb-3 flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {(author || handle || "?").replace(/^@/, "").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          {author && (
            <p className="truncate text-sm font-semibold leading-tight">{author}</p>
          )}
          {handle && (
            <p className="truncate text-xs text-muted-foreground">@{handle}</p>
          )}
        </div>
        <button
          type="button"
          className="shrink-0 text-[10px] text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => void openExternalUrl(bookmark.url).catch(() => {})}
        >
          View on X
        </button>
      </header>

      {body ? (
        <FormattedReaderText text={body} className="text-foreground/95" />
      ) : (
        <p className="text-xs italic text-muted-foreground">
          Tweet text was not captured. Open the original post or re-save with the
          extension.
        </p>
      )}

      {showVideoEmbed && tweetId && (
        <div className="mt-3">
          <TweetEmbedPlayer tweetId={tweetId} pageUrl={bookmark.url} />
        </div>
      )}

      {!showVideoEmbed && (bookmark.videoUrl?.trim() || posterUrl) && (
        <div className="mt-3">
          <MediaPreview
            videoUrl={bookmark.videoUrl}
            imageUrl={posterUrl}
            fallbackPageUrl={bookmark.url}
            alt="Tweet media"
          />
        </div>
      )}

      {externalLink && (
        <div className="mt-3">
          <ExternalLinkCard
            url={externalLink.url}
            title={externalLink.title}
            domain={externalLink.domain}
          />
        </div>
      )}

      <footer className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2">
        <Badge variant="secondary" className="text-[10px]">
          {bookmark.type}
        </Badge>
        {bookmark.captureStatus && (
          <Badge variant="outline" className="text-[10px] capitalize">
            {bookmark.captureStatus}
          </Badge>
        )}
        {tweetId && (
          <Badge variant="outline" className="font-mono text-[10px]">
            #{tweetId}
          </Badge>
        )}
        <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
          {bookmark.postedAt && (
            <span>Posted {formatDate(bookmark.postedAt)}</span>
          )}
          <span>Saved {formatDate(savedAt)}</span>
          {bookmark.recapturedAt && (
            <span>Re-captured {formatDate(bookmark.recapturedAt)}</span>
          )}
        </div>
      </footer>
    </article>
  );
}
