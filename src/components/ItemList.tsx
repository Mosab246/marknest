import { ScrollArea } from "@/components/ui/scroll-area";
import { ItemRow } from "@/components/ItemRow";
import type { BookmarkWithRelations } from "@/lib/types";

interface ItemListProps {
  bookmarks: BookmarkWithRelations[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (bookmark: BookmarkWithRelations) => void;
  onToggleFavorite: (id: string) => void;
  onArchive: (bookmark: BookmarkWithRelations) => void;
  onDelete: (bookmark: BookmarkWithRelations) => void;
}

export function ItemList({
  bookmarks,
  selectedId,
  onSelect,
  onEdit,
  onToggleFavorite,
  onArchive,
  onDelete,
}: ItemListProps) {
  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border/60">
        {bookmarks.map((bookmark) => (
          <ItemRow
            key={bookmark.id}
            bookmark={bookmark}
            selected={selectedId === bookmark.id}
            onSelect={() => onSelect(bookmark.id)}
            onEdit={() => onEdit(bookmark)}
            onToggleFavorite={() => onToggleFavorite(bookmark.id)}
            onArchive={() => onArchive(bookmark)}
            onDelete={() => onDelete(bookmark)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
