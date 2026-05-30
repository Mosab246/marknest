export function isPlayableVideoUrl(url: string): boolean {
  const u = url.trim();
  if (!u || u.startsWith("blob:")) return false;
  return /video\.twimg\.com/i.test(u) || /\.mp4(\?|$)/i.test(u);
}
