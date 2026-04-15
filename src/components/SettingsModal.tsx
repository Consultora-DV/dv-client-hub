import { useState } from "react";
import { motion } from "framer-motion";
import { X, Eye, EyeOff, Trash2, Key, ExternalLink, Bot } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApifyToken } from "@/hooks/useApifyToken";
import { useAiToken, AiProvider } from "@/hooks/useAiToken";
import { useToast } from "@/hooks/use-toast";

interface SettingsModalProps {
  onClose: () => void;
}

const AI_PROVIDERS: { value: AiProvider; label: string; helpUrl: string }[] = [
  { value: "claude", label: "Claude (Anthropic)", helpUrl: "https://console.anthropic.com/" },
  { value: "openai", label: "OpenAI (GPT-4o)", helpUrl: "https://platform.openai.com/api-keys" },
];

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { token, maskedToken, saveToken, removeToken } = useApifyToken();
  const { token: aiToken, provider: aiProvider, maskedToken: aiMasked, saveToken: saveAi, removeToken: removeAi } = useAiToken();
  const [inputToken, setInputToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiProv, setAiProv] = useState<AiProvider>(aiProvider);
  const [showAiToken, setShowAiToken] = useState(false);
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

  const handleSaveAi = () => {
    if (!aiInput.trim()) return;
    saveAi(aiInput.trim(), aiProv);
    setAiInput("");
    setShowAiToken(false);
    toast({ title: "API Key de IA guardada", description: "Se guardó correctamente." });
  };

  const handleRemoveAi = () => {
    removeAi();
    setAiInput("");
    toast({ title: "API Key eliminada" });
  };

  const currentAiHelp = AI_PROVIDERS.find(p => p.value === aiProv);

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
        className="w-full max-w-lg glass gold-border rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
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
        <div className="p-6 space-y-8">
          {/* Integraciones — Apify */}
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
                  <Button variant="destructive" size="sm" onClick={handleRemove} className="gap-2">
                    <Trash2 className="h-4 w-4" /> Eliminar token
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
                    <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    Obtén tu token en{" "}
                    <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                      console.apify.com <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                  <Button onClick={handleSave} disabled={!inputToken.trim()} className="gold-gradient text-primary-foreground hover:opacity-90">
                    Guardar
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* AI Assistant */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              Asistente IA
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Proveedor</label>
                <select
                  value={aiProv}
                  onChange={e => setAiProv(e.target.value as AiProvider)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {AI_PROVIDERS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <label className="text-sm font-medium text-foreground">API Key</label>

              {aiToken ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary border border-border/50">
                    <span className="text-sm text-muted-foreground font-mono flex-1 truncate">{aiMasked}</span>
                    <span className="text-xs text-status-approved bg-status-approved/15 px-2 py-0.5 rounded-full">Configurado</span>
                  </div>
                  <Button variant="destructive" size="sm" onClick={handleRemoveAi} className="gap-2">
                    <Trash2 className="h-4 w-4" /> Eliminar key
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      type={showAiToken ? "text" : "password"}
                      placeholder={`Pega tu API Key de ${aiProv === "claude" ? "Anthropic" : "OpenAI"}`}
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      className="pr-10 h-12 bg-secondary border-border/50 rounded-xl focus:border-primary/50"
                    />
                    <button type="button" onClick={() => setShowAiToken(!showAiToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showAiToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    Obtén tu key en{" "}
                    <a href={currentAiHelp?.helpUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                      {aiProv === "claude" ? "console.anthropic.com" : "platform.openai.com"} <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                  <Button onClick={handleSaveAi} disabled={!aiInput.trim()} className="gold-gradient text-primary-foreground hover:opacity-90">
                    Guardar
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-2">
                La API key se guarda localmente en tu dispositivo. Se usa para analizar blueprints de clientes automáticamente durante el onboarding.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
