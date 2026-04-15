import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "dv_apify_token";
const TOKEN_SYNC_EVENT = "dv_apify_token_sync";

function readStoredToken() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function useApifyToken() {
  const [token, setTokenState] = useState<string | null>(readStoredToken);

  useEffect(() => {
    const syncToken = () => setTokenState(readStoredToken());
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === STORAGE_KEY) {
        syncToken();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(TOKEN_SYNC_EVENT, syncToken);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(TOKEN_SYNC_EVENT, syncToken);
    };
  }, []);

  const saveToken = useCallback((value: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      return;
    }
    setTokenState(value);
    window.dispatchEvent(new Event(TOKEN_SYNC_EVENT));
  }, []);

  const removeToken = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      return;
    }
    setTokenState(null);
    window.dispatchEvent(new Event(TOKEN_SYNC_EVENT));
  }, []);

  const maskedToken = token
    ? "••••••••••••" + token.slice(-6)
    : null;

  return { token, maskedToken, saveToken, removeToken };
}
