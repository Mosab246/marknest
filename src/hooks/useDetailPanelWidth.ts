import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "marknest-detail-width";
const DEFAULT = 440;
const MIN = 360;
const MAX = 520;

function readWidth(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw ? parseInt(raw, 10) : DEFAULT;
    if (Number.isFinite(n)) return Math.min(MAX, Math.max(MIN, n));
  } catch {
    /* ignore */
  }
  return DEFAULT;
}

export function useDetailPanelWidth() {
  const [width, setWidth] = useState(readWidth);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(width));
    } catch {
      /* ignore */
    }
  }, [width]);

  const onResize = useCallback((el: HTMLElement | null) => {
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w >= MIN && w <= MAX) {
        setWidth(Math.round(w));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { width, minWidth: MIN, maxWidth: MAX, onResize };
}
