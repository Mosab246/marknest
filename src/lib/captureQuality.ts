export type CaptureQuality = "clean" | "noisy" | "partial" | "failed" | "unknown";

export function shouldShowQualityWarning(quality: string | null | undefined): boolean {
  if (!quality) return false;
  return quality === "noisy" || quality === "partial" || quality === "failed";
}

export function qualityLabel(quality: string | null | undefined): string {
  switch (quality) {
    case "noisy":
      return "Noisy capture";
    case "partial":
      return "Partial capture";
    case "failed":
      return "Failed capture";
    default:
      return "Capture issue";
  }
}
