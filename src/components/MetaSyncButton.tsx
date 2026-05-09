import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, AlertCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast as sonnerToast } from "sonner";
import { savePlatformToken, loadPlatformToken } from "@/services/metaIgService";
import { useAppState } from "@/contexts/AppStateContext";

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
  const { isSyncing, lastSyncTime, triggerMetaSync } = useAppState();
  const [configOpen, setConfigOpen] = useState(false);
  const [config, setConfig] = useState<TokenConfig>(EMPTY_CONFIG);
  const [hasToken, setHasToken] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing token config on mount / client change
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
      } else {
        setHasToken(false);
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
    const result = await triggerMetaSync(clienteId);
    if (result) onSyncComplete?.(result.synced);
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
          disabled={isSyncing}
          className={hasToken ? "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0" : "border-pink-500/50 text-pink-400 hover:bg-pink-500/10"}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Sincronizando…" : "Sincronizar con Meta"}
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
        {hasToken && !isSyncing && (
          <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs gap-1">
            <CheckCircle className="h-3 w-3" />
            {lastSyncTime ? `Última sync ${lastSyncTime}` : "Meta API conectado"}
          </Badge>
        )}
        {isSyncing && (
          <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-xs gap-1 animate-pulse">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Sincronizando en segundo plano…
          </Badge>
        )}
        {!hasToken && !isSyncing && (
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
