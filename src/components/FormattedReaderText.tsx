import { LinkifiedText } from "@/components/LinkifiedText";
import { cleanCapturedTextForDisplay } from "@/lib/captureText";
import { cn } from "@/lib/utils";

interface FormattedReaderTextProps {
  text: string | null | undefined;
  className?: string;
}

/** Renders tweet/article body with quote lines (`>`) as blockquotes. */
export function FormattedReaderText({ text, className }: FormattedReaderTextProps) {
  const display = cleanCapturedTextForDisplay(text);
  if (!display) return null;

  const blocks = splitQuoteBlocks(display);
  if (blocks.length === 1 && blocks[0].type === "text") {
    return <LinkifiedText text={display} className={className} />;
  }

  return (
    <div dir="auto" className={cn("reader-prose space-y-3", className)}>
      {blocks.map((block, i) =>
        block.type === "quote" ? (
          <blockquote
            key={i}
            className="border-l-2 border-muted-foreground/30 py-0.5 pl-3 text-sm leading-relaxed text-foreground/85"
          >
            <LinkifiedText text={block.content} className="text-inherit" />
          </blockquote>
        ) : (
          <LinkifiedText key={i} text={block.content} />
        ),
      )}
    </div>
  );
}

type Block = { type: "text" | "quote"; content: string };

function splitQuoteBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let current: Block | null = null;

  const flush = () => {
    if (current && current.content.trim()) blocks.push(current);
    current = null;
  };

  for (const line of lines) {
    const isQuote = /^>\s?/.test(line);
    const content = isQuote ? line.replace(/^>\s?/, "") : line;

    if (isQuote) {
      if (current?.type !== "quote") {
        flush();
        current = { type: "quote", content };
      } else {
        current.content += `\n${content}`;
      }
    } else {
      if (current?.type !== "text") {
        flush();
        current = { type: "text", content: line };
      } else {
        current.content += `\n${line}`;
      }
    }
  }
  flush();
  return blocks.length ? blocks : [{ type: "text", content: text }];
}
