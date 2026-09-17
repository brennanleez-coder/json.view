"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** Fixed-row-height windowing for a scroll container. */
export function useVirtual(count: number, rowHeight: number, overscan = 12) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(600);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setHeight(el.clientHeight);
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrollTop(el.scrollTop));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(count, Math.ceil((scrollTop + height) / rowHeight) + overscan);

  const scrollToIndex = useCallback(
    (index: number, align: "auto" | "center" = "auto") => {
      const el = ref.current;
      if (!el || index < 0) return;
      const top = index * rowHeight;
      const header = Number(el.dataset.stickyOffset ?? 0);
      if (align === "center") {
        el.scrollTop = Math.max(0, top - el.clientHeight / 2 + rowHeight / 2);
      } else if (top < el.scrollTop) {
        el.scrollTop = top;
      } else if (top + rowHeight > el.scrollTop + el.clientHeight - header) {
        el.scrollTop = top + rowHeight - el.clientHeight + header;
      }
    },
    [rowHeight],
  );

  return { ref, start, end, total: count * rowHeight, scrollToIndex, viewportRows: Math.max(1, Math.floor(height / rowHeight)) };
}
