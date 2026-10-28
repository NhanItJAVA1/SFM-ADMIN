import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { getRequestErrorMessage } from "@/components/admin/admin-page-shared";

/** Fetch only while this route is focused; cancel and ignore stale requests on blur. */
export function useAdminResource<T>(fetcher: (signal: AbortSignal) => Promise<T>, initialData: T) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const focused = useRef(false);
  const loaded = useRef(false);
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const reload = useCallback(async ({ refresh = false, silent = false } = {}) => {
    if (!focused.current) return;
    controller.current?.abort();
    const request = ++sequence.current;
    const nextController = new AbortController();
    controller.current = nextController;
    setLoading(!loaded.current && !silent && !refresh);
    setRefreshing(refresh || loaded.current);
    setError(null);
    try {
      const next = await fetcher(nextController.signal);
      if (request !== sequence.current || nextController.signal.aborted) return;
      loaded.current = true;
      setData(next);
    } catch (failure) {
      if (request !== sequence.current || nextController.signal.aborted) return;
      setError(getRequestErrorMessage(failure));
    } finally {
      if (request === sequence.current) {
        controller.current = null;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [fetcher]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    void reload();
    return () => {
      focused.current = false;
      sequence.current += 1;
      controller.current?.abort();
      controller.current = null;
    };
  }, [reload]));

  return { data, setData, loading, refreshing, error, reload };
}

export function useAdminPageActive() {
  const [active, setActive] = useState(false);
  useFocusEffect(useCallback(() => {
    setActive(true);
    return () => setActive(false);
  }, []));
  return active;
}
