import marknestLogo from "@/assets/marknest-logo.png";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  FolderOpen,
  Heart,
  Home,
  Library,
  MessageSquare,
  Newspaper,
  Search,
  Settings,
  Tag as TagIcon,
  Video,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Folder, LibraryFilter, LibraryView, SearchScope, Tag } from "@/lib/types";

const SEARCH_SCOPES: { id: SearchScope; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tweets", label: "Tweets" },
  { id: "articles", label: "Articles" },
  { id: "highlights", label: "Highlights" },
  { id: "notes", label: "Notes" },
];

interface LibrarySidebarProps {
  filter: LibraryFilter;
  onFilterChange: (filter: LibraryFilter) => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchScope: SearchScope;
  onSearchScopeChange: (scope: SearchScope) => void;
  folders: Folder[];
  tags: Tag[];
  counts?: {
    library: number;
    later: number;
    favorites: number;
    archived: number;
  };
}

function NavItem({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" />
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span>
      )}
    </button>
  );
}

export function LibrarySidebar({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  searchScope,
  onSearchScopeChange,
  folders,
  tags,
  counts,
}: LibrarySidebarProps) {
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);

  const isActive = (view: LibraryView, id?: string) => {
    if (filter.view !== view) return false;
    if (view === "folder") return filter.folderId === id;
    if (view === "tag") return filter.tagId === id;
    return true;
  };

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-primary/20">
          <img src={marknestLogo} alt="" className="h-6 w-6 object-contain" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-tight">MarkNest</h1>
          <p className="truncate text-[10px] text-muted-foreground">Local capture library</p>
        </div>
      </div>

      <div className="px-2 pb-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            data-search-input
            className="h-8 border-border/60 bg-background/40 pl-8 text-xs"
            placeholder="Search…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {SEARCH_SCOPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSearchScopeChange(s.id)}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                searchScope === s.id
                  ? "bg-primary/25 text-primary"
                  : "text-muted-foreground hover:bg-muted/50",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Separator className="bg-border/60" />

      <ScrollArea className="flex-1 px-2 py-2">
        <nav className="space-y-0.5">
          <p className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Browse
          </p>
          <NavItem
            active={isActive("home")}
            onClick={() => onFilterChange({ view: "home" })}
            icon={Home}
            label="Home"
            count={counts?.later}
          />
          <NavItem
            active={isActive("library")}
            onClick={() => onFilterChange({ view: "library" })}
            icon={Library}
            label="Library"
            count={counts?.library}
          />
          <NavItem
            active={isActive("article")}
            onClick={() => onFilterChange({ view: "article" })}
            icon={Newspaper}
            label="Articles"
          />
          <NavItem
            active={isActive("tweet")}
            onClick={() => onFilterChange({ view: "tweet" })}
            icon={MessageSquare}
            label="Tweets"
          />
          <NavItem
            active={isActive("thread")}
            onClick={() => onFilterChange({ view: "thread" })}
            icon={FileText}
            label="Threads"
          />
          <NavItem
            active={isActive("video")}
            onClick={() => onFilterChange({ view: "video" })}
            icon={Video}
            label="Videos"
          />

          <p className="mt-3 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Queues
          </p>
          <NavItem
            active={isActive("favorites")}
            onClick={() => onFilterChange({ view: "favorites" })}
            icon={Heart}
            label="Favorites"
            count={counts?.favorites}
          />
          <NavItem
            active={isActive("later")}
            onClick={() => onFilterChange({ view: "later" })}
            icon={Clock}
            label="Later"
            count={counts?.later}
          />
          <NavItem
            active={isActive("archive")}
            onClick={() => onFilterChange({ view: "archive" })}
            icon={Archive}
            label="Archive"
            count={counts?.archived}
          />
        </nav>

        <div className="mt-3">
          <button
            type="button"
            className="flex w-full items-center gap-1 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
            onClick={() => setFoldersOpen(!foldersOpen)}
          >
            {foldersOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Folders
          </button>
          {foldersOpen && (
            <div className="mt-0.5 space-y-0.5">
              {folders.length === 0 ? (
                <p className="px-2.5 py-1 text-[11px] text-muted-foreground">No folders</p>
              ) : (
                folders.map((folder) => (
                  <NavItem
                    key={folder.id}
                    active={isActive("folder", folder.id)}
                    onClick={() =>
                      onFilterChange({ view: "folder", folderId: folder.id })
                    }
                    icon={FolderOpen}
                    label={folder.name}
                  />
                ))
              )}
            </div>
          )}
        </div>

        <div className="mt-1">
          <button
            type="button"
            className="flex w-full items-center gap-1 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
            onClick={() => setTagsOpen(!tagsOpen)}
          >
            {tagsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Tags
          </button>
          {tagsOpen && (
            <div className="mt-0.5 space-y-0.5">
              {tags.length === 0 ? (
                <p className="px-2.5 py-1 text-[11px] text-muted-foreground">No tags</p>
              ) : (
                tags.map((tag) => (
                  <NavItem
                    key={tag.id}
                    active={isActive("tag", tag.id)}
                    onClick={() => onFilterChange({ view: "tag", tagId: tag.id })}
                    icon={TagIcon}
                    label={tag.name}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator className="bg-border/60" />
      <div className="p-2">
        <Button
          variant={filter.view === "settings" ? "secondary" : "ghost"}
          className="h-8 w-full justify-start gap-2 text-[13px]"
          onClick={() => onFilterChange({ view: "settings" })}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>
    </aside>
  );
}
