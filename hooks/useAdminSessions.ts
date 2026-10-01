"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminRequest } from "@/lib/admin/client";
import { sessionPageSchema, type ExchangeQuery, type SessionPage } from "@/lib/domain/admin";

export function useAdminSessions(query: ExchangeQuery) {
  const [response, setResponse] = useState<{ key: string; value: SessionPage } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const { page, filter, persona } = query;
  const queryKey = JSON.stringify([page, filter, persona]);

  const refresh = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const current = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminRequest("/api/admin/exchanges", { page, filter, persona, view: "sessions" }, sessionPageSchema, request.signal);
      if (current === generation.current) setResponse({ key: queryKey, value: result });
    } catch (failure) {
      if (current === generation.current) {
        setResponse(null);
        setError(failure instanceof Error ? failure.message : "Unable to load sessions.");
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [page, filter, persona, queryKey]);

  const invalidate = useCallback(() => { generation.current++; controller.current?.abort(); }, []);
  useEffect(() => { void refresh(); return invalidate; }, [refresh, invalidate]);

  const data = response?.key === queryKey ? response.value : null;
  return { data, loading: loading || (response !== null && data === null), error, refresh };
}
