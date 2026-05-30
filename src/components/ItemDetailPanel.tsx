import { useEffect, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  Copy,
  ExternalLink,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { ArticleCapturePreview } from "@/components/ArticleCapturePreview";
import { CaptureQualityBanner } from "@/components/CaptureQualityBanner";
import { HighlightsPanel } from "@/components/HighlightsPanel";
import { LinkifiedText } from "@/components/LinkifiedText";
import { SelectedTextQuote } from "@/components/SelectedTextQuote";
import { TweetCapturePreview } from "@/components/TweetCapturePreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useDetailPanelWidth } from "@/hooks/useDetailPanelWidth";
import { openExternalUrl, updateBookmark } from "@/lib/api";
import { textContainsUrlLike } from "@/lib/captureText";
import {
  bookmarkToInput,
  getDisplayTitle,
  getDisplayTweetId,
  getSourceLabel,
  getTweetBodyText,
  isTwitterUrl,
  shouldShowArticleReader,
  shouldShowTweetPreview,
} from "@/lib/itemDisplay";
import type { BookmarkWithRelations } from "@/lib/types";
import { copyToClipboard, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ItemDetailPanelProps {
  bookmark: BookmarkWithRelations | null;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onNotesSaved: (updated: BookmarkWithRelations) => void;
  onBookmarkRefresh?: () => void;
}

export function ItemDetailPanel({
  bookmark,
  onEdit,
  onToggleFavorite,
  onArchive,
  onDelete,
  onNotesSaved,
  onBookmarkRefresh,
}: ItemDetailPanelProps) {
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [rawOpen, setRawOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const { width, minWidth, maxWidth, onResize } = useDetailPanelWidth();

  useEffect(() => {
    setNotes(bookmark?.notes ?? "");
  }, [bookmark?.id, bookmark?.notes]);

  useEffect(() => {
    return onResize(panelRef.current);
  }, [onResize, bookmark?.id]);

  if (!bookmark) {
    return (
      <aside
        className="detail-panel flex h-full shrink-0 flex-col items-center justify-center p-8 text-center"
        style={{ width, minWidth, maxWidth }}
      >
        <p className="text-sm text-muted-foreground">
          Select an item to view details.
        </p>
      </aside>
    );
  }

  const title = getDisplayTitle(bookmark);
  const sourceLabel = getSourceLabel(bookmark);
  const tweetId = getDisplayTweetId(bookmark);
  const showTweetPreview = shouldShowTweetPreview(bookmark);
  const showArticleReader = shouldShowArticleReader(bookmark);
  const tweetBody = getTweetBodyText(bookmark);
  const selectedText = bookmark.selectedText?.trim() || "";
  const showRawCapture = showTweetPreview && Boolean(tweetBody);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const input = bookmarkToInput(bookmark);
      const updated = await updateBookmark({
        ...input,
        id: bookmark.id,
        notes: notes.trim() || null,
      });
      onNotesSaved(updated);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCopyUrl = async () => {
    await copyToClipboard(bookmark.url);
    setCopyMsg("Copied");
    setTimeout(() => setCopyMsg(null), 2000);
  };

  const notesPreview = notes.trim();
  const showNotesLinkPreview =
    notesPreview.length > 0 && textContainsUrlLike(notesPreview);

  return (
    <aside
      ref={panelRef}
      className={cn(
        "detail-panel flex h-full min-h-0 shrink-0 flex-col overflow-hidden resize-x",
      )}
      style={{ width, minWidth, maxWidth }}
    >
      <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => openExternalUrl(bookmark.url)}
          >
            <ExternalLink className="mr-1 h-3.5 w-3.5" />
            Open
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleCopyUrl}>
            <Copy className="mr-1 h-3.5 w-3.5" />
            {copyMsg ?? "Copy URL"}
          </Button>
        </div>
        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleFavorite}>
            <Star
              className={
                bookmark.isFavorite ? "fill-amber-400 text-amber-400" : "h-4 w-4"
              }
            />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onArchive}>
            {bookmark.isArchived ? (
              <ArchiveRestore className="h-4 w-4" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="info"
        className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
      >
        <TabsList className="mx-4 mt-3 w-auto shrink-0 justify-start bg-muted/40">
          <TabsTrigger value="info" className="text-xs">
            Info
          </TabsTrigger>
          <TabsTrigger value="highlights" className="text-xs">
            Highlights
            {bookmark.highlightCount > 0 && (
              <span className="ml-1 text-[10px] text-muted-foreground">
                ({bookmark.highlightCount})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">
            Notes
          </TabsTrigger>
          <TabsTrigger value="metadata" className="text-xs">
            Metadata
          </TabsTrigger>
        </TabsList>

        <div className="relative min-h-0 flex-1 basis-0">
          <TabsContent
            value="info"
            className="detail-tab-scroll absolute inset-0 mt-0 space-y-4 overflow-y-auto overscroll-contain px-4 pb-8 pt-2"
          >
            <div>
              <h2 className="text-lg font-semibold leading-tight">{title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{sourceLabel}</p>
            </div>

            <CaptureQualityBanner bookmark={bookmark} />

            <div className="reader-stack space-y-4">
              {showTweetPreview && <TweetCapturePreview bookmark={bookmark} />}
              {showArticleReader && !showTweetPreview && (
                <ArticleCapturePreview bookmark={bookmark} />
              )}
              {selectedText && <SelectedTextQuote text={selectedText} />}
              {!showTweetPreview &&
                !showArticleReader &&
                !selectedText &&
                bookmark.capturedText?.trim() && (
                  <section className="rounded-lg border border-border/80 bg-muted/10 p-3">
                    <LinkifiedText text={bookmark.capturedText} />
                  </section>
                )}
              {!showTweetPreview &&
                !showArticleReader &&
                !bookmark.capturedText?.trim() &&
                !selectedText &&
                bookmark.content?.trim() && (
                  <section>
                    <LinkifiedText text={bookmark.content} />
                  </section>
                )}
              {!showTweetPreview &&
                !showArticleReader &&
                !hasReaderContent(bookmark) && (
                  <p className="text-xs italic text-muted-foreground">
                    No local text saved yet. Use the Chrome extension to capture
                    this item.
                  </p>
                )}
            </div>

            {showRawCapture && (
              <section className="border-t border-border/40 pt-3">
                <button
                  type="button"
                  className="flex w-full items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                  onClick={() => setRawOpen((o) => !o)}
                >
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      rawOpen && "rotate-180",
                    )}
                  />
                  Raw capture
                </button>
                {rawOpen && (
                  <div className="mt-2 rounded-md border border-border/60 bg-muted/20 p-2 font-mono text-xs text-muted-foreground">
                    <p dir="auto" className="whitespace-pre-wrap break-words">
                      {tweetBody}
                    </p>
                  </div>
                )}
              </section>
            )}

            <div className="flex flex-wrap gap-1 border-t border-border/40 pt-3">
              <Badge variant="secondary" className="capitalize text-[10px]">
                {bookmark.type}
              </Badge>
              <Badge variant="outline" className="capitalize text-[10px]">
                {bookmark.status}
              </Badge>
              {bookmark.isFavorite && (
                <Badge variant="outline" className="text-[10px]">
                  Favorite
                </Badge>
              )}
              {bookmark.folderName && (
                <Badge variant="outline" className="text-[10px]">
                  {bookmark.folderName}
                </Badge>
              )}
              {bookmark.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-[10px]">
                  {tag.name}
                </Badge>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground">
              Saved {formatDate(bookmark.createdAt)} · Updated{" "}
              {formatDate(bookmark.updatedAt)}
            </p>
          </TabsContent>

          <TabsContent
            value="highlights"
            className="detail-tab-scroll absolute inset-0 mt-0 overflow-y-auto overscroll-contain px-4 pb-8 pt-2"
          >
            <HighlightsPanel
              bookmarkId={bookmark.id}
              onChanged={onBookmarkRefresh}
            />
          </TabsContent>

          <TabsContent
            value="notes"
            className="detail-tab-scroll absolute inset-0 mt-0 space-y-3 overflow-y-auto overscroll-contain px-4 pb-8 pt-2"
          >
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Your notes…"
              rows={10}
              className="min-h-[160px] resize-none bg-background/50 text-sm"
            />
            <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
              {savingNotes ? "Saving…" : "Save notes"}
            </Button>
            {showNotesLinkPreview && (
              <section className="space-y-1.5 border-t border-border/40 pt-3">
                <h3 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Preview
                </h3>
                <div className="rounded-md border border-border/60 bg-muted/15 p-3">
                  <LinkifiedText text={notesPreview} />
                </div>
              </section>
            )}
          </TabsContent>

          <TabsContent
            value="metadata"
            className="detail-tab-scroll absolute inset-0 mt-0 overflow-y-auto overscroll-contain px-4 pb-8 pt-2"
          >
            <dl className="space-y-3 text-sm">
              <MetaRow label="URL" value={bookmark.url} mono />
              {bookmark.canonicalUrl && (
                <MetaRow label="Canonical URL" value={bookmark.canonicalUrl} mono />
              )}
              {bookmark.source && <MetaRow label="Source" value={bookmark.source} />}
              {bookmark.siteName && (
                <MetaRow label="Site name" value={bookmark.siteName} />
              )}
              <MetaRow label="Type" value={bookmark.type} />
              {tweetId && <MetaRow label="Tweet ID" value={tweetId} mono />}
              {isTwitterUrl(bookmark.url) && (
                <MetaRow label="Platform" value="X / Twitter" />
              )}
              {bookmark.captureStatus && (
                <MetaRow label="Capture status" value={bookmark.captureStatus} />
              )}
              {bookmark.captureQuality && (
                <MetaRow label="Capture quality" value={bookmark.captureQuality} />
              )}
              {bookmark.videoUrl?.trim() && (
                <MetaRow label="Video URL" value={bookmark.videoUrl} mono />
              )}
              {bookmark.imageUrl?.trim() && (
                <MetaRow label="Image URL" value={bookmark.imageUrl} mono />
              )}
              <MetaRow label="Read status" value={bookmark.status} />
              {bookmark.capturedAt && (
                <MetaRow label="Captured at" value={formatDate(bookmark.capturedAt)} />
              )}
              <MetaRow label="Archived" value={bookmark.isArchived ? "Yes" : "No"} />
              <MetaRow label="Created" value={formatDate(bookmark.createdAt)} />
              <MetaRow label="Updated" value={formatDate(bookmark.updatedAt)} />
            </dl>
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}

function hasReaderContent(bookmark: BookmarkWithRelations): boolean {
  return Boolean(
    bookmark.capturedText?.trim() ||
      bookmark.content?.trim() ||
      bookmark.capturedDescription?.trim() ||
      bookmark.imageUrl?.trim(),
  );
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          mono ? "mt-0.5 break-all font-mono text-xs" : "mt-0.5 capitalize"
        }
      >
        {value}
      </dd>
    </div>
  );
}
