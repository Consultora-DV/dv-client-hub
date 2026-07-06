import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// Typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthNs }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Falta authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("El servidor de autorización no devolvió URL de redirección.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="glass gold-border rounded-2xl p-8 max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold text-foreground">No se pudo cargar la autorización</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando…</p>
      </main>
    );
  }

  const clientName = details.client?.name ?? "una aplicación externa";

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="glass gold-border gold-glow rounded-2xl p-8 max-w-md w-full space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-display font-bold gold-text">Autorizar acceso</h1>
          <p className="text-sm text-muted-foreground">Consultora DV — Panel de Clientes</p>
        </div>
        <p className="text-sm text-foreground text-center">
          <span className="font-semibold">{clientName}</span> quiere conectarse a tu cuenta y usar el
          panel como tú.
        </p>
        <p className="text-xs text-muted-foreground text-center">
          La app solo podrá ver los datos que tú puedas ver dentro del panel.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
            Rechazar
          </Button>
          <Button
            className="flex-1 gold-gradient text-primary-foreground"
            disabled={busy}
            onClick={() => decide(true)}
          >
            {busy ? "Autorizando…" : "Autorizar"}
          </Button>
        </div>
      </div>
    </main>
  );
}
