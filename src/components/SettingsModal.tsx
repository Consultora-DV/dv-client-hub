import { useState } from "react";
import { motion } from "framer-motion";
import { X, Eye, EyeOff, Trash2, Key, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApifyToken } from "@/hooks/useApifyToken";
import { useToast } from "@/hooks/use-toast";

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { token, maskedToken, saveToken, removeToken } = useApifyToken();
  const [inputToken, setInputToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    if (!inputToken.trim()) return;
    saveToken(inputToken.trim());
    setInputToken("");
    setShowToken(false);
    toast({ title: "Token guardado", description: "El API token de Apify se guardó correctamente." });
  };

  const handleRemove = () => {
    removeToken();
    setInputToken("");
    toast({ title: "Token eliminado", description: "El API token fue eliminado." });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg glass gold-border rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <h2 className="text-xl font-semibold text-foreground">Configuración del sistema</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Integraciones */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              Integraciones
            </h3>

            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Apify API Token</label>

              {token ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary border border-border/50">
                    <span className="text-sm text-muted-foreground font-mono flex-1 truncate">
                      {maskedToken}
                    </span>
                    <span className="text-xs text-status-approved bg-status-approved/15 px-2 py-0.5 rounded-full">
                      Configurado
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemove}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar token
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      type={showToken ? "text" : "password"}
                      placeholder="Pega tu Apify API Token"
                      value={inputToken}
                      onChange={(e) => setInputToken(e.target.value)}
                      className="pr-10 h-12 bg-secondary border-border/50 rounded-xl focus:border-primary/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    Obtén tu token en{" "}
                    <a
                      href="https://console.apify.com/account/integrations"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      console.apify.com/account/integrations
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                  <Button
                    onClick={handleSave}
                    disabled={!inputToken.trim()}
                    className="gold-gradient text-primary-foreground hover:opacity-90"
                  >
                    Guardar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
