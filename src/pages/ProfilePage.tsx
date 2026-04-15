import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useAppState } from "@/contexts/AppStateContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Camera, ExternalLink, BarChart3, Edit, Instagram, Globe, MapPin,
  Share2, FileText, Upload, X, Rocket, DollarSign, Crosshair, Trophy, BookOpen
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import OnboardingPage from "./OnboardingPage";

const GOALS_MAP: Record<string, { label: string; icon: string }> = {
  grow: { label: "Crecer mi audiencia", icon: "🚀" },
  monetize: { label: "Monetizar mi contenido", icon: "💰" },
  sales: { label: "Aumentar ventas", icon: "🎯" },
  brand: { label: "Posicionar mi marca", icon: "🏆" },
  educate: { label: "Educar a mi audiencia", icon: "📚" },
};

const SOCIAL_META: Record<string, { label: string; color: string; icon: typeof Instagram }> = {
  instagram: { label: "Instagram", color: "from-pink-500 to-purple-600", icon: Instagram },
  tiktok: { label: "TikTok", color: "from-gray-900 to-cyan-500", icon: Share2 },
  facebook: { label: "Facebook", color: "from-blue-600 to-blue-500", icon: Globe },
  youtube: { label: "YouTube", color: "from-red-600 to-red-500", icon: Globe },
  googleMaps: { label: "Google Maps", color: "from-green-600 to-green-400", icon: MapPin },
  website: { label: "Sitio web", color: "from-gray-500 to-gray-400", icon: Globe },
};

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "K";
  return String(n);
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { selectedClienteId, clients } = useAppState();
  const { isAdmin, isClient } = usePermissions();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [editingOnboarding, setEditingOnboarding] = useState(false);

  const targetUserId = isClient ? user?.id : selectedClienteId || user?.id;
  const profileData = targetUserId ? JSON.parse(localStorage.getItem(`dv_client_profile_${targetUserId}`) || "null") : null;
  const photo = targetUserId ? localStorage.getItem(`dv_user_profile_photo_${targetUserId}`) : null;

  // Fallback: get basic info from clients list if no onboarding data
  const clientInfo = clients.find((c) => c.id === targetUserId);

  const fadeUp = reduced
    ? { initial: {}, animate: {} }
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  if (editingOnboarding) {
    return <OnboardingPage editMode onComplete={() => setEditingOnboarding(false)} />;
  }

  // Build a merged profile: onboarding data takes priority, fallback to DB data
  const displayName = profileData?.fullName || clientInfo?.nombre || user?.name || "Cliente";
  const displayBusiness = profileData?.businessName || clientInfo?.empresa || "";
  const displayIndustry = profileData?.industry || clientInfo?.especialidad || "";
  const displayEmail = clientInfo?.email || user?.email || "";

  if (isAdmin && !selectedClienteId) {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div {...fadeUp} className="glass gold-border rounded-xl p-10 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Camera className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground">Selecciona un cliente</h2>
          <p className="text-sm text-muted-foreground">Usa el selector de clientes en el menú superior para ver el perfil de un cliente.</p>
        </motion.div>
      </div>
    );
  }

  if (!profileData && !clientInfo) {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div {...fadeUp} className="glass gold-border rounded-xl p-10 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Edit className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground">Sin perfil seleccionado</h2>
          <p className="text-sm text-muted-foreground">Selecciona un cliente desde el menú superior para ver su perfil.</p>
        </motion.div>
      </div>
    );
  }

  const socialEntries = Object.entries(profileData?.socialNetworks || {});
  const strategy = profileData?.strategy;
  const goal = strategy?.mainGoal ? GOALS_MAP[strategy.mainGoal] : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="glass gold-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-primary/30 shrink-0">
            {photo ? (
              <img src={photo} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full gold-gradient flex items-center justify-center text-3xl font-bold text-primary-foreground">
                {displayName.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl font-display font-bold text-foreground">{displayName}</h1>
            {displayBusiness && <p className="text-sm text-primary font-medium">{displayBusiness}</p>}
            {displayEmail && <p className="text-xs text-muted-foreground">{displayEmail}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              {[displayIndustry, [profileData?.city, profileData?.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
            </p>
            <Badge className="mt-2 bg-status-approved/20 text-status-approved border-status-approved/30">Cliente activo</Badge>
          </div>
          <Button onClick={() => setEditingOnboarding(true)} variant="outline" className="rounded-xl shrink-0">
            <Edit className="h-4 w-4 mr-2" /> {profileData ? "Editar perfil" : "Completar perfil"}
          </Button>
        </div>
      </motion.div>

      {/* Social Networks */}
      {socialEntries.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">Redes Sociales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {socialEntries.map(([key, sn]: [string, any]) => {
              const meta = SOCIAL_META[key];
              if (!meta) return null;
              return (
                <div key={key} className="glass gold-border rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${meta.color} flex items-center justify-center`}>
                      <meta.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{meta.label}</p>
                      {sn.handle && <p className="text-xs text-muted-foreground">{sn.handle}</p>}
                    </div>
                  </div>
                  {sn.followers > 0 && (
                    <p className="text-2xl font-bold text-foreground mb-3">{formatFollowers(sn.followers)}</p>
                  )}
                  <div className="flex gap-2">
                    {sn.url && (
                      <a href={sn.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" /> Abrir
                      </a>
                    )}
                    <button onClick={() => navigate("/metricas")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                      <BarChart3 className="h-3 w-3" /> Ver métricas
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Strategy */}
      {strategy && (strategy.mainGoal || strategy.targetAudience || strategy.tone?.length || strategy.contentPillars?.length) && (
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">Estrategia</h2>
          <div className="glass gold-border rounded-xl p-5 space-y-4">
            {goal && (
              <div className="flex items-center gap-3">
                <span className="text-2xl">{goal.icon}</span>
                <div>
                  <p className="text-xs text-muted-foreground">Objetivo principal</p>
                  <p className="text-sm font-medium text-foreground">{goal.label}</p>
                </div>
              </div>
            )}
            {strategy.targetAudience && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Audiencia ideal</p>
                <p className="text-sm text-foreground">{strategy.targetAudience}</p>
              </div>
            )}
            {strategy.tone?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Tono de comunicación</p>
                <div className="flex flex-wrap gap-2">
                  {strategy.tone.map((t: string) => (
                    <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
            {strategy.contentPillars?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Pilares de contenido</p>
                <div className="flex flex-wrap gap-2">
                  {strategy.contentPillars.map((p: string) => (
                    <Badge key={p} className="text-xs gold-gradient text-primary-foreground">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Blueprint */}
      <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">Expediente / Blueprint</h2>
        {profileData?.blueprintFile ? (
          <div className="glass gold-border rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profileData?.blueprintName || "Expediente"}</p>
              <p className="text-xs text-muted-foreground">Archivo guardado</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setEditingOnboarding(true)}>
              Reemplazar
            </Button>
          </div>
        ) : (
          <div className="glass rounded-xl p-8 text-center">
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin expediente. Puedes subir uno desde "Editar perfil".</p>
          </div>
        )}
      </motion.div>

      {/* Admin-only project data */}
      {(isAdmin) && (
        <motion.div {...fadeUp} transition={{ delay: 0.5 }}>
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">Datos del proyecto</h2>
          <div className="glass gold-border rounded-xl p-5 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Plan / servicio contratado</label>
              <Input defaultValue="" placeholder="Ej: Plan Premium — 8 videos/mes" className="bg-secondary border-border/50 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notas internas (solo admin)</label>
              <Textarea placeholder="Notas sobre este cliente..." className="bg-secondary border-border/50 rounded-xl text-sm resize-none" rows={3} />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
