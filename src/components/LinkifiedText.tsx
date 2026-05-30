import { useMemo, type ReactNode } from "react";
import { openExternalUrl } from "@/lib/api";
import {
  cleanCapturedTextForDisplay,
  extractUrlsFromText,
  hrefForOpen,
  type TextUrlSpan,
} from "@/lib/captureText";
import { cn } from "@/lib/utils";

interface LinkifiedTextProps {
  text: string | null | undefined;
  className?: string;
  dir?: "auto" | "ltr" | "rtl";
}

function buildNodes(text: string, spans: TextUrlSpan[]): ReactNode[] {
  if (!spans.length) return [text];
  const nodes: ReactNode[] = [];
  let cursor = 0;

  spans.forEach((span, i) => {
    if (span.start > cursor) {
      nodes.push(text.slice(cursor, span.start));
    }
    const label = text.slice(span.start, span.end);
    nodes.push(
      <button
        key={`link-${span.start}-${i}`}
        type="button"
        className="inline text-left text-primary underline underline-offset-2 hover:text-primary/80"
        onClick={(e) => {
          e.stopPropagation();
          void openExternalUrl(hrefForOpen(span.href)).catch(() => {});
        }}
      >
        {label}
      </button>,
    );
    cursor = span.end;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return nodes;
}

export function LinkifiedText({
  text,
  className,
  dir = "auto",
}: LinkifiedTextProps) {
  const { display, nodes } = useMemo(() => {
    const display = cleanCapturedTextForDisplay(text);
    if (!display) return { display: "", nodes: [] as React.ReactNode[] };
    const spans = extractUrlsFromText(display);
    return { display, nodes: buildNodes(display, spans) };
  }, [text]);

  if (!display) return null;

  return (
    <p
      dir={dir}
      className={cn(
        "reader-prose whitespace-pre-wrap break-words text-sm leading-relaxed",
        className,
      )}
    >
      {nodes.length ? nodes : display}
    </p>
  );
}
