import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, AlertCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast as sonnerToast } from "sonner";
import { syncInstagramPosts, savePlatformToken, loadPlatformToken } from "@/services/metaIgService";

interface MetaSyncButtonProps {
  clienteId: string | null;
  onSyncComplete?: (synced: number) => void;
}

interface TokenConfig {
  igUserId: string;
  igUsername: string;
  accessToken: string;
  pageId: string;
  adAccountId: string;
}

const EMPTY_CONFIG: TokenConfig = {
  igUserId: "",
  igUsername: "",
  accessToken: "",
  pageId: "",
  adAccountId: "",
};

export default function MetaSyncButton({ clienteId, onSyncComplete }: MetaSyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [config, setConfig] = useState<TokenConfig>(EMPTY_CONFIG);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing token config on mount
  useEffect(() => {
    if (!clienteId) return;
    loadPlatformToken(clienteId).then((saved) => {
      if (saved) {
        setHasToken(true);
        setConfig({
          igUserId: saved.igUserId,
          igUsername: saved.igUsername,
          accessToken: saved.accessToken,
          pageId: saved.pageId ?? "",
          adAccountId: saved.adAccountId ?? "",
        });
      }
    });
  }, [clienteId]);

  const handleSaveConfig = async () => {
    if (!clienteId || !config.igUserId || !config.accessToken) {
      sonnerToast.error("IG User ID y Access Token son requeridos");
      return;
    }
    setSaving(true);
    try {
      await savePlatformToken(
        clienteId,
        config.igUserId,
        config.igUsername,
        config.accessToken,
        config.pageId || undefined,
        config.adAccountId || undefined
      );
      setHasToken(true);
      setConfigOpen(false);
      sonnerToast.success("Configuración de Meta guardada");
    } catch (err: any) {
      sonnerToast.error(err.message || "Error guardando configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!clienteId) {
      sonnerToast.error("Selecciona un cliente primero");
      return;
    }
    if (!hasToken) {
      setConfigOpen(true);
      return;
    }

    setSyncing(true);
    try {
      const result = await syncInstagramPosts({
        clienteId,
        igUserId: config.igUserId,
        accessToken: config.accessToken,
        limit: 50,
      });

      const now = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
      setLastSync(now);

      if (result.synced > 0 || result.refreshed > 0) {
        sonnerToast.success(
          `✅ ${result.synced} nuevos posts · ${result.refreshed} actualizados`,
          { description: `Sincronización completa via Meta Graph API • ${now}` }
        );
        onSyncComplete?.(result.synced);
      } else if (result.errors > 0) {
        sonnerToast.warning(`Sincronización con ${result.errors} errores. Revisa la configuración.`);
      } else {
        sonnerToast.info("Todo al día — no hay posts nuevos desde la última sincronización");
      }
    } catch (err: any) {
      sonnerToast.error(err.message || "Error sincronizando con Meta");
    } finally {
      setSyncing(false);
    }
  };

  if (!clienteId) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Sync button */}
        <Button
          size="sm"
          variant={hasToken ? "default" : "outline"}
          onClick={handleSync}
          disabled={syncing}
          className={hasToken ? "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0" : "border-pink-500/50 text-pink-400 hover:bg-pink-500/10"}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando…" : "Sincronizar con Meta"}
        </Button>

        {/* Config gear */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfigOpen(true)}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          title="Configurar credenciales de Meta"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>

        {/* Status badges */}
        {hasToken && !syncing && (
          <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs gap-1">
            <CheckCircle className="h-3 w-3" />
            {lastSync ? `Última sync ${lastSync}` : "Meta API conectado"}
          </Badge>
        )}
        {!hasToken && (
          <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-xs gap-1">
            <AlertCircle className="h-3 w-3" />
            Sin configurar
          </Badge>
        )}
      </div>

      {/* Config dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="glass gold-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <span className="text-lg">📸</span>
              Configurar Meta / Instagram API
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Instagram User ID *</Label>
              <Input
                placeholder="17841447268646281"
                value={config.igUserId}
                onChange={(e) => setConfig((c) => ({ ...c, igUserId: e.target.value.trim() }))}
                className="bg-secondary border-border/50 text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Encuéntralo en Business Manager → Cuentas de Instagram → Identificador
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Username de Instagram</Label>
              <Input
                placeholder="theskinclubmx"
                value={config.igUsername}
                onChange={(e) => setConfig((c) => ({ ...c, igUsername: e.target.value.trim().replace("@", "") }))}
                className="bg-secondary border-border/50 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Access Token (long-lived) *</Label>
              <Input
                type="password"
                placeholder="EAABsbCS…"
                value={config.accessToken}
                onChange={(e) => setConfig((c) => ({ ...c, accessToken: e.target.value.trim() }))}
                className="bg-secondary border-border/50 text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Token de 60 días generado en developers.facebook.com con scope instagram_basic
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Facebook Page ID</Label>
                <Input
                  placeholder="700532247451757"
                  value={config.pageId}
                  onChange={(e) => setConfig((c) => ({ ...c, pageId: e.target.value.trim() }))}
                  className="bg-secondary border-border/50 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Ad Account ID</Label>
                <Input
                  placeholder="act_995765…"
                  value={config.adAccountId}
                  onChange={(e) => setConfig((c) => ({ ...c, adAccountId: e.target.value.trim() }))}
                  className="bg-secondary border-border/50 text-sm font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfigOpen(false)} className="text-muted-foreground">
              Cancelar
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={saving || !config.igUserId || !config.accessToken}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0"
            >
              {saving ? "Guardando…" : "Guardar configuración"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
