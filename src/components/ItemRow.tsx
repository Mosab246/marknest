import {
  Archive,
  ArchiveRestore,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemThumbnail } from "@/components/ItemThumbnail";
import {
  estimateReadTime,
  formatRelativeDate,
  getAuthorLabel,
  getDisplayTitle,
  getPreviewText,
  getSourceLabel,
  getTextForReadTime,
} from "@/lib/itemDisplay";
import type { BookmarkWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ItemRowProps {
  bookmark: BookmarkWithRelations;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export function ItemRow({
  bookmark,
  selected,
  onSelect,
  onEdit,
  onToggleFavorite,
  onArchive,
  onDelete,
}: ItemRowProps) {
  const title = getDisplayTitle(bookmark);
  const preview = getPreviewText(bookmark);
  const author = getAuthorLabel(bookmark);
  const sourceLabel = getSourceLabel(bookmark);
  const textForTime = getTextForReadTime(bookmark);
  const readTime = estimateReadTime(textForTime);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group flex cursor-pointer items-start gap-3 px-3 py-2.5",
        "list-row",
        selected && "list-row-selected",
      )}
    >
      <ItemThumbnail bookmark={bookmark} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-sm font-medium leading-snug">{title}</h3>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {formatRelativeDate(bookmark.updatedAt)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{preview}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-muted-foreground">
          <span>{sourceLabel}</span>
          {author && (
            <>
              <span>·</span>
              <span>{author}</span>
            </>
          )}
          {readTime && textForTime && (
            <>
              <span>·</span>
              <span>{readTime}</span>
            </>
          )}
        </div>
        {(bookmark.tags.length > 0 ||
          bookmark.folderName ||
          bookmark.highlightCount > 0) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {bookmark.highlightCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                {bookmark.highlightCount}{" "}
                {bookmark.highlightCount === 1 ? "highlight" : "highlights"}
              </Badge>
            )}
            {bookmark.folderName && (
              <Badge variant="outline" className="h-4 px-1 text-[9px]">
                {bookmark.folderName}
              </Badge>
            )}
            {bookmark.tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="secondary" className="h-4 px-1 text-[9px]">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div
        className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleFavorite}
        >
          <Star
            className={cn(
              "h-3.5 w-3.5",
              bookmark.isFavorite && "fill-amber-400 text-amber-400",
            )}
          />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onArchive}>
          {bookmark.isArchived ? (
            <ArchiveRestore className="h-3.5 w-3.5" />
          ) : (
            <Archive className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
