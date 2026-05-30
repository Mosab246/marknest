import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { tagsToInput } from "@/lib/tagUtils";
import type {
  BookmarkInput,
  BookmarkType,
  BookmarkStatus,
  BookmarkWithRelations,
  Folder,
} from "@/lib/types";
import { isValidUrl } from "@/lib/utils";

const TYPES: BookmarkType[] = ["tweet", "thread", "article", "video", "other"];
const STATUSES: BookmarkStatus[] = ["unread", "read", "archived"];

interface BookmarkFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmark?: BookmarkWithRelations | null;
  folders: Folder[];
  onSubmit: (input: BookmarkInput, id?: string) => Promise<void>;
}

const emptyForm = (): BookmarkInput => ({
  url: "",
  title: "",
  authorName: "",
  authorHandle: "",
  content: "",
  notes: "",
  summary: "",
  type: "tweet",
  status: "unread",
  isFavorite: false,
  folderName: "",
  tagsInput: "",
});

export function BookmarkForm({
  open,
  onOpenChange,
  bookmark,
  folders,
  onSubmit,
}: BookmarkFormProps) {
  const [form, setForm] = useState<BookmarkInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (bookmark) {
      setForm({
        url: bookmark.url,
        title: bookmark.title ?? "",
        authorName: bookmark.authorName ?? "",
        authorHandle: bookmark.authorHandle ?? "",
        content: bookmark.content ?? "",
        notes: bookmark.notes ?? "",
        summary: bookmark.summary ?? "",
        type: bookmark.type,
        status: bookmark.status,
        isFavorite: bookmark.isFavorite,
        folderName: bookmark.folderName ?? "",
        tagsInput: tagsToInput(bookmark.tags),
      });
    } else {
      setForm(emptyForm());
    }
    setError(null);
  }, [open, bookmark]);

  const update = (patch: Partial<BookmarkInput>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUrl(form.url)) {
      setError("A valid http(s) URL is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(
        {
          ...form,
          title: form.title?.trim() || null,
          authorName: form.authorName?.trim() || null,
          authorHandle: form.authorHandle?.trim() || null,
          content: form.content?.trim() || null,
          notes: form.notes?.trim() || null,
          summary: form.summary?.trim() || null,
          folderName: form.folderName?.trim() || null,
          tagsInput: form.tagsInput?.trim() || null,
        },
        bookmark?.id,
      );
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto border-border bg-card sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{bookmark ? "Edit capture" : "New capture"}</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Save URL and pasted content locally. No Twitter API required.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL *</Label>
            <Input
              id="url"
              value={form.url}
              onChange={(e) => update({ url: e.target.value })}
              placeholder="https://..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title ?? ""}
              onChange={(e) => update({ title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="authorName">Author</Label>
              <Input
                id="authorName"
                value={form.authorName ?? ""}
                onChange={(e) => update({ authorName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authorHandle">Handle</Label>
              <Input
                id="authorHandle"
                value={form.authorHandle ?? ""}
                onChange={(e) => update({ authorHandle: e.target.value })}
                placeholder="@username"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Content / thread text</Label>
            <Textarea
              id="content"
              value={form.content ?? ""}
              onChange={(e) => update({ content: e.target.value })}
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes ?? ""}
              onChange={(e) => update({ notes: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary">Manual summary</Label>
            <Textarea
              id="summary"
              value={form.summary ?? ""}
              onChange={(e) => update({ summary: e.target.value })}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => update({ type: v as BookmarkType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => update({ status: v as BookmarkStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="folder">Folder</Label>
            <Input
              id="folder"
              list="folder-suggestions"
              value={form.folderName ?? ""}
              onChange={(e) => update({ folderName: e.target.value })}
              placeholder="Optional"
            />
            <datalist id="folder-suggestions">
              {folders.map((f) => (
                <option key={f.id} value={f.name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={form.tagsInput ?? ""}
              onChange={(e) => update({ tagsInput: e.target.value })}
              placeholder="research, dev, ideas"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isFavorite}
              onChange={(e) => update({ isFavorite: e.target.checked })}
              className="rounded border-input"
            />
            Favorite
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <SheetFooter className="px-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : bookmark ? "Save capture" : "Capture"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
