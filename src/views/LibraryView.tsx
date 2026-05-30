import { useCallback, useEffect, useMemo, useState } from "react";
import {
  archiveBookmark,
  createBookmark,
  deleteBookmark,
  getBookmark,
  getBookmarks,
  getFolders,
  getTags,
  toggleFavorite,
  unarchiveBookmark,
  updateBookmark,
} from "@/lib/api";
import { buildBookmarkQuery } from "@/lib/libraryFilters";
import type {
  BookmarkInput,
  BookmarkWithRelations,
  Folder,
  LibraryFilter,
  SearchScope,
  SortOption,
  Tag,
  TopBarTab,
} from "@/lib/types";
import { BookmarkForm } from "@/components/BookmarkForm";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { EmptyState } from "@/components/EmptyState";
import { ItemDetailPanel } from "@/components/ItemDetailPanel";
import { ItemList } from "@/components/ItemList";
import { LibraryTopBar } from "@/components/LibraryTopBar";

interface LibraryViewProps {
  filter: LibraryFilter;
  search: string;
  searchScope: SearchScope;
}

export function LibraryView({ filter, search, searchScope }: LibraryViewProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkWithRelations[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [, setTags] = useState<Tag[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [topTab, setTopTab] = useState<TopBarTab>("later");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BookmarkWithRelations | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BookmarkWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const fullQuery = useMemo(
    () =>
      buildBookmarkQuery(filter, {
        search: debouncedSearch,
        searchScope,
        sort,
        topTab: filter.view === "library" || filter.view === "home" ? topTab : null,
      }),
    [filter, debouncedSearch, searchScope, sort, topTab],
  );

  const loadMeta = useCallback(async () => {
    const [f, t] = await Promise.all([getFolders(), getTags()]);
    setFolders(f);
    setTags(t);
  }, []);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBookmarks(fullQuery);
      setBookmarks(data);
      setSelectedId((current) => {
        if (current && data.some((b) => b.id === current)) return current;
        return data[0]?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, [fullQuery]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (formOpen) {
          setFormOpen(false);
          return;
        }
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen]);

  const selected = bookmarks.find((b) => b.id === selectedId) ?? null;

  const handleSubmit = async (input: BookmarkInput, id?: string) => {
    if (id) {
      await updateBookmark({ ...input, id });
    } else {
      await createBookmark(input);
    }
    await loadMeta();
    await loadBookmarks();
  };

  const refreshOne = (updated: BookmarkWithRelations) => {
    setBookmarks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const handleToggleFavorite = async (id: string) => {
    const updated = await toggleFavorite(id);
    refreshOne(updated);
  };

  const handleArchive = async (bookmark: BookmarkWithRelations) => {
    const updated = bookmark.isArchived
      ? await unarchiveBookmark(bookmark.id)
      : await archiveBookmark(bookmark.id);
    await loadBookmarks();
    refreshOne(updated);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteBookmark(deleteTarget.id);
    setDeleteTarget(null);
    if (selectedId === deleteTarget.id) setSelectedId(null);
    await loadMeta();
    await loadBookmarks();
  };

  return (
    <div className="flex h-full flex-col">
      <LibraryTopBar
        view={filter.view}
        topTab={topTab}
        onTopTabChange={setTopTab}
        sort={sort}
        onSortChange={setSort}
        searchActive={Boolean(debouncedSearch.trim())}
        resultCount={bookmarks.length}
        onCapture={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      />
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col border-r border-border bg-background/30">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : bookmarks.length === 0 ? (
            <EmptyState
              onAdd={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              title={
                debouncedSearch
                  ? "No matching items"
                  : filter.view === "archive"
                    ? "Archive is empty"
                    : undefined
              }
              description={
                debouncedSearch
                  ? "Try a different search term."
                  : "Capture tweets, threads, and links to build your library."
              }
            />
          ) : (
            <ItemList
              bookmarks={bookmarks}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onEdit={(b) => {
                setEditing(b);
                setFormOpen(true);
              }}
              onToggleFavorite={handleToggleFavorite}
              onArchive={handleArchive}
              onDelete={setDeleteTarget}
            />
          )}
        </div>
        <ItemDetailPanel
          bookmark={selected}
          onEdit={() => {
            if (selected) {
              setEditing(selected);
              setFormOpen(true);
            }
          }}
          onToggleFavorite={() => selected && handleToggleFavorite(selected.id)}
          onArchive={() => selected && handleArchive(selected)}
          onDelete={() => selected && setDeleteTarget(selected)}
          onNotesSaved={refreshOne}
          onBookmarkRefresh={async () => {
            if (!selected) return;
            const updated = await getBookmark(selected.id);
            refreshOne(updated);
          }}
        />
      </div>

      <BookmarkForm
        open={formOpen}
        onOpenChange={setFormOpen}
        bookmark={editing}
        folders={folders}
        onSubmit={handleSubmit}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget?.title || deleteTarget?.url || "item"}
        onConfirm={handleDelete}
      />
    </div>
  );
}
