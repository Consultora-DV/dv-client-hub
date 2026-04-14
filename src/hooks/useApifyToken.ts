import { useState, useCallback } from "react";

const STORAGE_KEY = "dv_apify_token";

export function useApifyToken() {
  const [token, setTokenState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const saveToken = useCallback((value: string) => {
    localStorage.setItem(STORAGE_KEY, value);
    setTokenState(value);
  }, []);

  const removeToken = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setTokenState(null);
  }, []);

  const maskedToken = token
    ? "••••••••••••" + token.slice(-6)
    : null;

  return { token, maskedToken, saveToken, removeToken };
}
