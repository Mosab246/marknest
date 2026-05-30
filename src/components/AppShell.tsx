import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import { getBookmarks, getFolders, getTags } from "@/lib/api";
import type { Folder, LibraryFilter, SearchScope, Tag } from "@/lib/types";
import { LibrarySidebar } from "@/components/LibrarySidebar";
import { LibraryView } from "@/views/LibraryView";
import { SettingsView } from "@/views/SettingsView";

const defaultFilter: LibraryFilter = { view: "library" };

export function AppShell() {
  const [filter, setFilter] = useState<LibraryFilter>(defaultFilter);
  const [search, setSearch] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>("all");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [counts, setCounts] = useState({
    library: 0,
    later: 0,
    favorites: 0,
    archived: 0,
  });

  const loadMeta = useCallback(async () => {
    const [f, t] = await Promise.all([getFolders(), getTags()]);
    setFolders(f);
    setTags(t);
  }, []);

  const loadCounts = useCallback(async () => {
    const [library, later, favorites, archived] = await Promise.all([
      getBookmarks({ isArchived: false, sort: "newest" }),
      getBookmarks({ isArchived: false, status: "unread", sort: "newest" }),
      getBookmarks({ isArchived: false, isFavorite: true, sort: "newest" }),
      getBookmarks({ isArchived: true, sort: "newest" }),
    ]);
    setCounts({
      library: library.length,
      later: later.length,
      favorites: favorites.length,
      archived: archived.length,
    });
  }, []);

  useEffect(() => {
    loadMeta();
    loadCounts();
    const interval = setInterval(() => {
      loadMeta();
      loadCounts();
    }, 8000);
    return () => clearInterval(interval);
  }, [loadMeta, loadCounts]);

  useEffect(() => {
    const unlisten = listen("navigate-settings", () => {
      setFilter({ view: "settings" });
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>("[data-search-input]")?.focus();
      }
      if (e.key === "Escape") {
        const sheet = document.querySelector("[data-state='open'][role='dialog']");
        if (sheet) return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <LibrarySidebar
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        searchScope={searchScope}
        onSearchScopeChange={setSearchScope}
        folders={folders}
        tags={tags}
        counts={counts}
      />
      <main className="min-w-0 flex-1 panel-bg">
        {filter.view === "settings" ? (
          <SettingsView />
        ) : (
          <LibraryView filter={filter} search={search} searchScope={searchScope} />
        )}
      </main>
    </div>
  );
}
