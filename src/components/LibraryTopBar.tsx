import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getViewTitle, supportsTopBarTabs } from "@/lib/libraryFilters";
import type { LibraryView, SortOption, TopBarTab } from "@/lib/types";

const SORTS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Date saved (newest)" },
  { value: "oldest", label: "Date saved (oldest)" },
  { value: "updated", label: "Date updated" },
];

interface LibraryTopBarProps {
  view: LibraryView;
  topTab: TopBarTab;
  onTopTabChange: (tab: TopBarTab) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  searchActive?: boolean;
  resultCount?: number;
  onCapture: () => void;
}

export function LibraryTopBar({
  view,
  topTab,
  onTopTabChange,
  sort,
  onSortChange,
  searchActive,
  resultCount,
  onCapture,
}: LibraryTopBarProps) {
  const showTabs = supportsTopBarTabs(view);
  const tabs: { id: TopBarTab; label: string }[] = [
    { id: "later", label: "Later" },
    { id: "shortlist", label: "Shortlist" },
    { id: "archive", label: "Archive" },
  ];

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3">
      <div className="flex min-w-0 items-center gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            {getViewTitle(view)}
          </h2>
          {searchActive && resultCount !== undefined && (
            <p className="text-[11px] text-muted-foreground">
              {resultCount} {resultCount === 1 ? "result" : "results"}
            </p>
          )}
        </div>
        {showTabs && (
          <div className="flex rounded-md border border-border bg-muted/30 p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTopTabChange(tab.id)}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium transition-colors",
                  topTab === tab.id
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={onCapture} className="gap-1">
          <Plus className="h-4 w-4" />
          Capture
        </Button>
      </div>
    </header>
  );
}
