import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const buildMarker = "2026-04-23-env-refresh-2";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.error("[Consultora DV] Variables de entorno de Supabase no configuradas. Verifica VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en tu archivo .env");
}

(window as Window & { __DV_BUILD_MARKER__?: string }).__DV_BUILD_MARKER__ = buildMarker;

createRoot(document.getElementById("root")!).render(<App />);
