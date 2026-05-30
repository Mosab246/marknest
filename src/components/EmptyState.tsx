import { BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onAdd: () => void;
  title?: string;
  description?: string;
}

export function EmptyState({
  onAdd,
  title = "No bookmarks yet",
  description = "Save tweets, threads, articles, and useful links to build your personal knowledge base.",
}: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-16 text-center">
      <div className="rounded-full bg-secondary p-4">
        <BookmarkPlus className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <Button onClick={onAdd}>Capture your first item</Button>
    </div>
  );
}
