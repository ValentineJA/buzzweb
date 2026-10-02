"use client";

import { useSyncExternalStore } from "react";
import { accountStorageKey, useAccount } from "@/app/components/auth/account-provider";

const cache = new Map<string, { raw: string | null; value: unknown }>();
const fallback = new Map<string, unknown>();
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("buzz-local-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("buzz-local-change", callback);
  };
}

/** Local prototype data only. This is not an account or messaging backend. */
export function useLocalState<T>(unscopedKey: string, initial: T): [T, (next: T | ((previous: T) => T)) => void] {
  const account = useAccount();
  const key = accountStorageKey(account.uid, unscopedKey);
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key);
      const previous = cache.get(key);
      if (previous && previous.raw === raw) return previous.value as T;
      const value = raw ? JSON.parse(raw) as T : (fallback.get(key) as T ?? initial);
      cache.set(key, { raw, value });
      return value;
    } catch { return fallback.get(key) as T ?? initial; }
  };
  const state = useSyncExternalStore(subscribe, read, () => initial);
  const setState = (next: T | ((previous: T) => T)) => {
    const value = typeof next === "function" ? (next as (previous: T) => T)(read()) : next;
    fallback.set(key, value);
    try {
      const raw = JSON.stringify(value);
      localStorage.setItem(key, raw);
      cache.set(key, { raw, value });
    } catch { cache.delete(key); }
    window.dispatchEvent(new Event("buzz-local-change"));
  };
  return [state, setState];
}