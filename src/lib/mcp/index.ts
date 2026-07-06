import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listVideos from "./tools/list-videos";
import listScripts from "./tools/list-scripts";
import listCalendarEvents from "./tools/list-calendar-events";
import listDocuments from "./tools/list-documents";
import getMyProfile from "./tools/get-my-profile";

// Issuer MUST be the direct supabase.co host — build it from the project ref
// (Vite inlines VITE_ vars at build time; import-safe at cold start).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "dv-client-hub",
  title: "Consultora DV — Panel de Clientes",
  version: "0.1.0",
  instructions:
    "Herramientas del panel privado de Consultora DV (Dante Vega). Cada llamada se ejecuta como el usuario autenticado; RLS de Lovable Cloud filtra los datos que el usuario puede ver. Usa list_videos, list_scripts, list_calendar_events, list_documents y get_my_profile para consultar el trabajo del cliente conectado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listVideos, listScripts, listCalendarEvents, listDocuments],
});
