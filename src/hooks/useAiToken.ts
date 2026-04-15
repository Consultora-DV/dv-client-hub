import { useState, useCallback, useEffect } from "react";

const TOKEN_KEY = "dv_ai_token";
const PROVIDER_KEY = "dv_ai_provider";
const SYNC_EVENT = "dv_ai_token_sync";

export type AiProvider = "claude" | "openai";

function readToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function readProvider(): AiProvider {
  try {
    const v = localStorage.getItem(PROVIDER_KEY);
    return v === "openai" ? "openai" : "claude";
  } catch { return "claude"; }
}

export function useAiToken() {
  const [token, setToken] = useState<string | null>(readToken);
  const [provider, setProvider] = useState<AiProvider>(readProvider);

  useEffect(() => {
    const sync = () => { setToken(readToken()); setProvider(readProvider()); };
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === TOKEN_KEY || e.key === PROVIDER_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(SYNC_EVENT, sync);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(SYNC_EVENT, sync); };
  }, []);

  const saveToken = useCallback((value: string, prov: AiProvider) => {
    try {
      localStorage.setItem(TOKEN_KEY, value);
      localStorage.setItem(PROVIDER_KEY, prov);
    } catch { return; }
    setToken(value);
    setProvider(prov);
    window.dispatchEvent(new Event(SYNC_EVENT));
  }, []);

  const removeToken = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(PROVIDER_KEY);
    } catch { return; }
    setToken(null);
    setProvider("claude");
    window.dispatchEvent(new Event(SYNC_EVENT));
  }, []);

  const maskedToken = token ? "••••••••••••" + token.slice(-6) : null;

  return { token, provider, maskedToken, hasToken: !!token, saveToken, removeToken };
}
