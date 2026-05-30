import { LinkifiedText } from "@/components/LinkifiedText";
import { cn } from "@/lib/utils";

interface SelectedTextQuoteProps {
  text: string;
  className?: string;
}

export function SelectedTextQuote({ text, className }: SelectedTextQuoteProps) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  return (
    <section className={cn("space-y-1.5", className)}>
      <h3 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Selected text
      </h3>
      <blockquote
        dir="auto"
        className="border-l-2 border-primary/40 bg-muted/25 py-2 pl-3 pr-2"
      >
        <LinkifiedText text={trimmed} className="text-foreground/90" />
      </blockquote>
    </section>
  );
}
