import { ReaderContentView } from "@/components/ReaderContentView";
import {
  cleanCapturedTextForDisplay,
  getExternalLinkFromBookmark,
} from "@/lib/captureText";
import { getReaderBodyText } from "@/lib/itemDisplay";
import type { BookmarkWithRelations } from "@/lib/types";

interface ArticleCapturePreviewProps {
  bookmark: BookmarkWithRelations;
}

export function ArticleCapturePreview({ bookmark }: ArticleCapturePreviewProps) {
  const body = cleanCapturedTextForDisplay(getReaderBodyText(bookmark));
  const description = bookmark.capturedDescription?.trim() || null;
  const externalLink = getExternalLinkFromBookmark(bookmark);

  return (
    <ReaderContentView
      body={body || null}
      description={description}
      imageUrl={bookmark.imageUrl}
      externalLink={externalLink}
      className="rounded-lg border border-border/80 bg-muted/10 p-3"
    />
  );
}
