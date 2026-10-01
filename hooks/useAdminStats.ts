"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminRequest } from "@/lib/admin/client";
import { statsSchema, type Stats } from "@/lib/domain/admin";

export function useAdminStats() {
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const current = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminRequest("/api/admin/stats", {}, statsSchema, request.signal);
      if (current === generation.current) setData(result);
    } catch (failure) {
      if (current === generation.current) {
        setData(null);
        setError(failure instanceof Error ? failure.message : "Unable to load analytics.");
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);
  const invalidate = useCallback(() => { generation.current++; controller.current?.abort(); }, []);
  useEffect(() => { void refresh(); return invalidate; }, [refresh, invalidate]);
  return { data, loading, error, refresh };
}
