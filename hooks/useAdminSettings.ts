"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminRequest } from "@/lib/admin/client";
import {
  appSettingsSchema,
  type AppSettings,
  type SettingsPatch,
} from "@/lib/domain/admin";

export function useAdminSettings() {
  const [saved, setSaved] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const current = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminRequest(
        "/api/admin/settings",
        {},
        appSettingsSchema,
        request.signal,
      );
      if (current === generation.current) setSaved(result);
    } catch (failure) {
      if (current === generation.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "Unable to load settings.",
        );
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);

  const save = useCallback(async (patch: SettingsPatch) => {
    if (busy.current) return null;
    busy.current = true;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const current = ++generation.current;
    setSaving(true);
    setError(null);
    try {
      const result = await adminRequest(
        "/api/admin/settings",
        patch,
        appSettingsSchema,
        request.signal,
      );
      if (current === generation.current) {
        setSaved(result);
        return result;
      }
      return null;
    } catch (failure) {
      if (current === generation.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "Unable to save settings.",
        );
      return null;
    } finally {
      busy.current = false;
      if (current === generation.current) {
        setSaving(false);
        setLoading(false);
      }
    }
  }, []);

  const invalidate = useCallback(() => {
    generation.current++;
    controller.current?.abort();
  }, []);
  useEffect(() => {
    void refresh();
    return invalidate;
  }, [refresh, invalidate]);
  return { saved, save, loading, saving, error, refresh };
}
