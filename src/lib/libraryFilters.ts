import type {
  BookmarkQuery,
  BookmarkType,
  LibraryFilter,
  LibraryView,
  SearchScope,
  SortOption,
  TopBarTab,
} from "./types";

export function getViewTitle(view: LibraryView): string {
  const titles: Record<LibraryView, string> = {
    home: "Home",
    library: "Library",
    tweet: "Tweets",
    thread: "Threads",
    article: "Articles",
    video: "Videos",
    favorites: "Favorites",
    later: "Later",
    archive: "Archive",
    folder: "Folder",
    tag: "Tag",
    settings: "Settings",
  };
  return titles[view] ?? "Library";
}

export function buildBookmarkQuery(
  filter: LibraryFilter,
  options: {
    search?: string | null;
    searchScope?: SearchScope | null;
    sort?: SortOption | null;
    topTab?: TopBarTab | null;
  } = {},
): BookmarkQuery {
  const scope = options.searchScope ?? "all";
  const q: BookmarkQuery = {
    sort: options.sort ?? "newest",
    search: options.search?.trim() || null,
    searchScope: scope === "all" ? null : scope,
  };

  switch (filter.view) {
    case "home":
    case "later":
      q.isArchived = false;
      q.status = "unread";
      break;
    case "library":
      q.isArchived = false;
      break;
    case "tweet":
    case "thread":
    case "article":
    case "video":
      q.isArchived = false;
      q.bookmarkType = filter.view as BookmarkType;
      break;
    case "favorites":
      q.isArchived = false;
      q.isFavorite = true;
      break;
    case "archive":
      q.isArchived = true;
      break;
    case "folder":
      q.isArchived = false;
      q.folderId = filter.folderId ?? null;
      break;
    case "tag":
      q.isArchived = false;
      q.tagId = filter.tagId ?? null;
      break;
    default:
      q.isArchived = false;
  }

  if (options.topTab && (filter.view === "library" || filter.view === "home")) {
    switch (options.topTab) {
      case "later":
        q.isArchived = false;
        q.status = "unread";
        q.isFavorite = null;
        break;
      case "shortlist":
        q.isArchived = false;
        q.isFavorite = true;
        q.status = null;
        break;
      case "archive":
        q.isArchived = true;
        q.status = null;
        q.isFavorite = null;
        break;
    }
  }

  return q;
}

export function supportsTopBarTabs(view: LibraryView): boolean {
  return view === "library" || view === "home";
}
