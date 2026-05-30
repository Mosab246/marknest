import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LinkifiedText } from "@/components/LinkifiedText";
import {
  createHighlight,
  deleteHighlight,
  getHighlights,
  updateHighlight,
} from "@/lib/api";
import type { Highlight } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface HighlightsPanelProps {
  bookmarkId: string;
  onChanged?: () => void;
}

export function HighlightsPanel({ bookmarkId, onChanged }: HighlightsPanelProps) {
  const [items, setItems] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHighlights(bookmarkId);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [bookmarkId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    const text = newText.trim();
    if (!text) return;
    await createHighlight({
      bookmarkId,
      text,
      note: newNote.trim() || null,
      source: "manual",
    });
    setNewText("");
    setNewNote("");
    await load();
    onChanged?.();
  };

  const handleSaveNote = async (id: string) => {
    await updateHighlight({ id, note: editNote.trim() || null });
    setEditingId(null);
    await load();
    onChanged?.();
  };

  const handleDelete = async (id: string) => {
    await deleteHighlight(id);
    await load();
    onChanged?.();
  };

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading highlights…</p>;
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2 rounded-lg border border-border/70 bg-muted/10 p-3">
        <h3 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Add highlight
        </h3>
        <Textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Highlight text…"
          rows={3}
          className="min-h-[72px] resize-none text-sm"
        />
        <Input
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Note (optional)"
          className="h-8 text-xs"
        />
        <Button type="button" size="sm" className="h-8 text-xs" onClick={handleAdd}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add highlight
        </Button>
      </section>

      {items.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">
          No highlights yet. Save selected text with the extension or add one above.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((h) => (
            <li
              key={h.id}
              className="rounded-lg border border-border/70 bg-background/40 p-3"
            >
              <blockquote
                dir="auto"
                className="border-l-2 border-primary/30 pl-3"
              >
                <LinkifiedText text={h.text} className="text-foreground/90" />
              </blockquote>
              {editingId === h.id ? (
                <div className="mt-2 space-y-2">
                  <Input
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Note"
                    className="h-8 text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleSaveNote(h.id)}
                    >
                      Save note
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {h.note?.trim() && (
                    <p className="mt-2 text-xs text-muted-foreground">{h.note}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {h.source || "highlight"} · {formatDate(h.createdAt)}
                    </span>
                    <div className="flex gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingId(h.id);
                          setEditNote(h.note || "");
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(h.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
