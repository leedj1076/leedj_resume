"use client";

import { useCallback, useEffect, useRef } from "react";

export function useAutoScroll(dependency: unknown, status: string) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el)
      nearBottom.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 96;
  }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !nearBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [dependency, status]);
  return { scrollRef, onScroll };
}
