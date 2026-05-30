import { FormattedReaderText } from "@/components/FormattedReaderText";
import { ExternalLinkCard } from "@/components/ExternalLinkCard";
import { MediaPreview } from "@/components/MediaPreview";
import type { ExternalLinkInfo } from "@/lib/captureText";
import { cn } from "@/lib/utils";

interface ReaderContentViewProps {
  body?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  externalLink?: ExternalLinkInfo | null;
  className?: string;
}

export function ReaderContentView({
  body,
  description,
  imageUrl,
  externalLink,
  className,
}: ReaderContentViewProps) {
  const hasBody = Boolean(body?.trim());
  const hasDesc = Boolean(description?.trim());

  if (!hasBody && !hasDesc && !imageUrl?.trim() && !externalLink) {
    return null;
  }

  return (
    <article className={cn("reader-prose space-y-4", className)}>
      {hasDesc && (
        <p dir="auto" className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {hasBody && <FormattedReaderText text={body} />}
      {imageUrl?.trim() && <MediaPreview imageUrl={imageUrl} />}
      {externalLink && (
        <ExternalLinkCard
          url={externalLink.url}
          title={externalLink.title}
          domain={externalLink.domain}
        />
      )}
    </article>
  );
}
