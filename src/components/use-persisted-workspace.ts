"use client";

import { useCallback, useSyncExternalStore, type SetStateAction } from "react";

import type { PersistedWorkspace } from "@/lib/workspace";
import {
  WORKSPACE_STORAGE_KEY,
  createInitialWorkspace,
  readWorkspaceStorage,
  writeWorkspaceStorage,
} from "@/lib/workspace";

const HYDRATION_SUBSCRIBE = () => () => undefined;
const INITIAL_WORKSPACE_SNAPSHOT = createInitialWorkspace();
const workspaceListeners = new Set<() => void>();
let cachedRawWorkspace: string | null | undefined;
let cachedWorkspaceSnapshot = INITIAL_WORKSPACE_SNAPSHOT;

function emitWorkspaceChange() {
  for (const listener of workspaceListeners) {
    listener();
  }
}

function getWorkspaceSnapshot() {
  if (typeof window === "undefined") {
    return INITIAL_WORKSPACE_SNAPSHOT;
  }

  const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);

  if (raw === cachedRawWorkspace) {
    return cachedWorkspaceSnapshot;
  }

  cachedRawWorkspace = raw;
  cachedWorkspaceSnapshot = raw
    ? readWorkspaceStorage()
    : INITIAL_WORKSPACE_SNAPSHOT;

  return cachedWorkspaceSnapshot;
}

function subscribeWorkspace(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === WORKSPACE_STORAGE_KEY) {
      listener();
    }
  };

  workspaceListeners.add(listener);
  window.addEventListener("storage", onStorage);

  return () => {
    workspaceListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePersistedWorkspace() {
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    () => INITIAL_WORKSPACE_SNAPSHOT,
  );
  const isHydrated = useSyncExternalStore(
    HYDRATION_SUBSCRIBE,
    () => true,
    () => false,
  );
  const setWorkspace = useCallback(
    (value: SetStateAction<PersistedWorkspace>) => {
      const previous = getWorkspaceSnapshot();
      const next =
        typeof value === "function"
          ? (value as (current: PersistedWorkspace) => PersistedWorkspace)(
              previous,
            )
          : value;

      cachedWorkspaceSnapshot = next;
      cachedRawWorkspace = JSON.stringify(next);
      writeWorkspaceStorage(next);
      emitWorkspaceChange();
    },
    [],
  );

  return {
    workspace,
    setWorkspace,
    isHydrated,
  };
}
