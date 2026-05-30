export type BookmarkType = "tweet" | "thread" | "article" | "video" | "other";
export type BookmarkStatus = "unread" | "read" | "archived";
export type SortOption = "newest" | "oldest" | "updated";
export type SearchScope = "all" | "tweets" | "articles" | "highlights" | "notes";

export type LibraryView =
  | "home"
  | "library"
  | "tweet"
  | "thread"
  | "article"
  | "video"
  | "favorites"
  | "later"
  | "archive"
  | "folder"
  | "tag"
  | "settings";

export type TopBarTab = "later" | "shortlist" | "archive";

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkWithRelations {
  id: string;
  url: string;
  title: string | null;
  authorName: string | null;
  authorHandle: string | null;
  content: string | null;
  notes: string | null;
  summary: string | null;
  source: string | null;
  canonicalUrl: string | null;
  capturedTitle: string | null;
  capturedAuthor: string | null;
  capturedDescription: string | null;
  capturedText: string | null;
  selectedText: string | null;
  siteName: string | null;
  faviconUrl: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  tweetId: string | null;
  captureStatus: string | null;
  capturedAt: string | null;
  captureQuality: string | null;
  captureWarning: string | null;
  postedAt: string | null;
  recapturedAt: string | null;
  highlightCount: number;
  type: BookmarkType;
  status: BookmarkStatus;
  isFavorite: boolean;
  isArchived: boolean;
  folderId: string | null;
  folderName: string | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface CaptureBridgeStatus {
  running: boolean;
  port: number;
  lastError: string | null;
}

export interface AppSettings {
  closeToTray: boolean;
  startWithWindows: boolean;
  startMinimizedToTray: boolean;
}

export interface BookmarkInput {
  url: string;
  title?: string | null;
  authorName?: string | null;
  authorHandle?: string | null;
  content?: string | null;
  notes?: string | null;
  summary?: string | null;
  type: BookmarkType;
  status: BookmarkStatus;
  isFavorite: boolean;
  folderName?: string | null;
  tagsInput?: string | null;
}

export interface UpdateBookmarkInput extends BookmarkInput {
  id: string;
}

export interface Highlight {
  id: string;
  bookmarkId: string;
  text: string;
  note: string | null;
  source: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkQuery {
  search?: string | null;
  searchScope?: SearchScope | null;
  folderId?: string | null;
  tagId?: string | null;
  bookmarkType?: BookmarkType | null;
  status?: BookmarkStatus | null;
  isFavorite?: boolean | null;
  isArchived?: boolean | null;
  sort?: SortOption | null;
}

export interface LibraryFilter {
  view: LibraryView;
  folderId?: string;
  tagId?: string;
}

/** @deprecated Use LibraryFilter */
export type SidebarView = LibraryView;
/** @deprecated Use LibraryFilter */
export type SidebarFilter = LibraryFilter;
