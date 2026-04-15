import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Camera, Check, ChevronRight, ChevronLeft, User, Share2, Target, FileUp,
  Instagram, Globe, MapPin, Upload, X, FileText, Rocket, DollarSign, Crosshair, Trophy, BookOpen,
  Sparkles, Loader2, AlertCircle, Settings, CheckCircle2
} from "lucide-react";
import { useAiToken } from "@/hooks/useAiToken";
import { parseBlueprint, type BlueprintResult } from "@/services/aiParserService";
import { SettingsModal } from "@/components/SettingsModal";
import * as pdfjsLib from "pdfjs-dist";

const INDUSTRIES = [
  "Salud y bienestar", "Moda y estilo", "Gastronomía", "Tecnología",
  "Educación", "Finanzas", "Bienes raíces", "Legal", "Entretenimiento", "Otro",
];

const GOALS = [
  { id: "grow", label: "Crecer mi audiencia", icon: "🚀" },
  { id: "monetize", label: "Monetizar mi contenido", icon: "💰" },
  { id: "sales", label: "Aumentar ventas", icon: "🎯" },
  { id: "brand", label: "Posicionar mi marca", icon: "🏆" },
  { id: "educate", label: "Educar a mi audiencia", icon: "📚" },
];

const TONES = [
  "Profesional", "Cercano y cálido", "Educativo", "Inspiracional",
  "Entretenido", "Directo", "Empoderador",
];

const PILLARS = [
  "Educación", "Motivación", "Entretenimiento", "Autoridad", "Casos de éxito",
  "Detrás de cámaras", "Productos/Servicios", "Comunidad", "Tendencias", "Humor",
];

interface SocialNetwork {
  active: boolean;
  handle: string;
  url: string;
  followers: number;
}

const SOCIAL_NETWORKS = [
  { key: "instagram", label: "Instagram", color: "from-pink-500 to-purple-600", icon: Instagram },
  { key: "tiktok", label: "TikTok", color: "from-gray-900 to-cyan-500", icon: Share2 },
  { key: "facebook", label: "Facebook", color: "from-blue-600 to-blue-500", icon: Globe },
  { key: "youtube", label: "YouTube", color: "from-red-600 to-red-500", icon: Globe },
  { key: "googleMaps", label: "Google Maps / Negocio", color: "from-green-600 to-green-400", icon: MapPin },
  { key: "website", label: "Sitio web", color: "from-gray-500 to-gray-400", icon: Globe },
];

interface OnboardingData {
  fullName: string;
  businessName: string;
  industry: string;
  city: string;
  country: string;
  whatsapp: string;
  photo: string | null;
  socials: Record<string, SocialNetwork>;
  mainGoal: string;
  targetAudience: string;
  tone: string[];
  contentPillars: string[];
  blueprintFile: string | null;
  blueprintName: string;
}

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export default function OnboardingPage({ editMode = false, onComplete }: { editMode?: boolean; onComplete?: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const blueprintRef = useRef<HTMLInputElement>(null);

  // AI parsing state
  const { hasToken, token: aiToken, provider: aiProvider } = useAiToken();
  const [blueprintText, setBlueprintText] = useState<string | null>(null);
  const [isParsingAi, setIsParsingAi] = useState(false);
  const [aiParseError, setAiParseError] = useState<string | null>(null);
  const [aiParseResult, setAiParseResult] = useState<BlueprintResult | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());
  const existingProfile = user?.id ? localStorage.getItem(`dv_client_profile_${user.id}`) : null;
  const parsed = existingProfile ? JSON.parse(existingProfile) : null;

  const [data, setData] = useState<OnboardingData>(() => ({
    fullName: parsed?.fullName || user?.name || "",
    businessName: parsed?.businessName || "",
    industry: parsed?.industry || "",
    city: parsed?.city || "",
    country: parsed?.country || "",
    whatsapp: parsed?.whatsapp || "",
    photo: user?.id ? localStorage.getItem(`dv_user_profile_photo_${user.id}`) : null,
    socials: parsed?.socialNetworks
      ? Object.fromEntries(
          SOCIAL_NETWORKS.map(sn => [
            sn.key,
            parsed.socialNetworks[sn.key]
              ? { active: true, handle: parsed.socialNetworks[sn.key].handle || "", url: parsed.socialNetworks[sn.key].url || "", followers: parsed.socialNetworks[sn.key].followers || 0 }
              : { active: false, handle: "", url: "", followers: 0 }
          ])
        )
      : Object.fromEntries(SOCIAL_NETWORKS.map(sn => [sn.key, { active: false, handle: "", url: "", followers: 0 }])),
    mainGoal: parsed?.strategy?.mainGoal || "",
    targetAudience: parsed?.strategy?.targetAudience || "",
    tone: parsed?.strategy?.tone || [],
    contentPillars: parsed?.strategy?.contentPillars || [],
    blueprintFile: parsed?.blueprintFile || (user?.id ? localStorage.getItem(`dv_client_blueprint_${user.id}`) : null),
    blueprintName: parsed?.blueprintName || "",
  }));

  const update = (partial: Partial<OnboardingData>) => setData(prev => ({ ...prev, ...partial }));

  const steps = [
    { label: "Sobre ti", icon: User },
    { label: "Redes sociales", icon: Share2 },
    { label: "Tu estrategia", icon: Target },
    { label: "Expediente", icon: FileUp },
  ];

  const canNext = (s: number) => {
    if (s === 0) return data.fullName.trim() && data.businessName.trim() && data.industry;
    if (s === 1) return Object.values(data.socials).some(sn => sn.active);
    return true;
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Máximo 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => update({ photo: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleBlueprintChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("Máximo 10MB"); return; }
    const reader = new FileReader();
    reader.onload = () => update({ blueprintFile: reader.result as string, blueprintName: file.name });
    reader.readAsDataURL(file);
  };

  const handleComplete = () => {
    if (!user?.id) return;

    const socialNetworks: Record<string, any> = {};
    Object.entries(data.socials).forEach(([key, sn]) => {
      if (sn.active) {
        if (key === "website") {
          socialNetworks[key] = { url: sn.url };
        } else {
          socialNetworks[key] = { handle: sn.handle, url: sn.url, followers: sn.followers };
        }
      }
    });

    const profile = {
      fullName: data.fullName,
      businessName: data.businessName,
      industry: data.industry,
      city: data.city,
      country: data.country,
      whatsapp: data.whatsapp,
      socialNetworks,
      strategy: (data.mainGoal || data.targetAudience || data.tone.length || data.contentPillars.length)
        ? { mainGoal: data.mainGoal, targetAudience: data.targetAudience, tone: data.tone, contentPillars: data.contentPillars }
        : undefined,
      blueprintFile: data.blueprintFile || undefined,
      blueprintName: data.blueprintName || undefined,
    };

    localStorage.setItem(`dv_client_profile_${user.id}`, JSON.stringify(profile));
    if (data.photo) localStorage.setItem(`dv_user_profile_photo_${user.id}`, data.photo);
    if (data.blueprintFile) localStorage.setItem(`dv_client_blueprint_${user.id}`, data.blueprintFile);
    localStorage.setItem(`dv_onboarding_complete_${user.id}`, "true");

    if (editMode && onComplete) {
      onComplete();
    } else {
      setShowWelcome(true);
      setTimeout(() => navigate("/dashboard"), 2500);
    }
  };

  if (showWelcome) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1 }}
            className="w-20 h-20 mx-auto rounded-full gold-gradient flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <Check className="h-10 w-10 text-primary-foreground" />
            </motion.div>
          </motion.div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            ¡Bienvenido a tu panel, <span className="gold-text">{data.fullName}</span>! 🎉
          </h1>
          <p className="text-muted-foreground">Tu espacio de trabajo está listo.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center py-6 border-b border-border/50">
        <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center text-primary-foreground font-bold text-sm">
          DV
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 py-6 px-4">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => { if (i < step || (i <= step)) setStep(i); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                i === step
                  ? "gold-gradient text-primary-foreground"
                  : i < step
                    ? "bg-status-approved/20 text-status-approved"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && <div className="w-6 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <div className="space-y-5">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-display font-bold text-foreground">Cuéntanos sobre ti</h2>
                  <p className="text-sm text-muted-foreground mt-1">Esta información nos ayuda a personalizar tu experiencia</p>
                </div>

                {/* Photo */}
                <div className="flex justify-center">
                  <button onClick={() => fileRef.current?.click()} className="relative w-24 h-24 rounded-full overflow-hidden group border-2 border-primary/30">
                    {data.photo ? (
                      <img src={data.photo} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full gold-gradient flex items-center justify-center text-2xl font-bold text-primary-foreground">
                        {data.fullName.substring(0, 2).toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </button>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png" onChange={handlePhotoChange} className="hidden" />
                </div>

                <Field label="Nombre completo *" value={data.fullName} onChange={v => update({ fullName: v })} />
                <Field label="Nombre de marca o negocio *" value={data.businessName} onChange={v => update({ businessName: v })} />

                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Industria / nicho *</label>
                  <select
                    value={data.industry}
                    onChange={e => update({ industry: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Selecciona...</option>
                    {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ciudad" value={data.city} onChange={v => update({ city: v })} />
                  <Field label="País" value={data.country} onChange={v => update({ country: v })} />
                </div>

                <Field label="WhatsApp de contacto" value={data.whatsapp} onChange={v => update({ whatsapp: v })} type="tel" placeholder="+52 668 234 3672" />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-display font-bold text-foreground">Tus redes sociales</h2>
                  <p className="text-sm text-muted-foreground mt-1">Activa al menos una red social para continuar</p>
                </div>

                {SOCIAL_NETWORKS.map(sn => {
                  const val = data.socials[sn.key];
                  return (
                    <div key={sn.key} className={`glass rounded-xl p-4 transition-all ${val.active ? "gold-border" : "border border-border/30"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${sn.color} flex items-center justify-center`}>
                            <sn.icon className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-foreground">{sn.label}</span>
                        </div>
                        <Switch
                          checked={val.active}
                          onCheckedChange={checked => {
                            update({ socials: { ...data.socials, [sn.key]: { ...val, active: checked } } });
                          }}
                        />
                      </div>
                      {val.active && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="space-y-2 mt-3">
                          {sn.key !== "website" && (
                            <Input
                              placeholder="@usuario"
                              value={val.handle}
                              onChange={e => update({ socials: { ...data.socials, [sn.key]: { ...val, handle: e.target.value } } })}
                              className="bg-secondary border-border/50 rounded-xl text-sm"
                            />
                          )}
                          <Input
                            placeholder={sn.key === "website" ? "https://tusitio.com" : "URL del perfil"}
                            value={val.url}
                            onChange={e => update({ socials: { ...data.socials, [sn.key]: { ...val, url: e.target.value } } })}
                            className="bg-secondary border-border/50 rounded-xl text-sm"
                          />
                          {sn.key !== "website" && (
                            <Input
                              type="number"
                              placeholder="Seguidores actuales"
                              value={val.followers || ""}
                              onChange={e => update({ socials: { ...data.socials, [sn.key]: { ...val, followers: parseInt(e.target.value) || 0 } } })}
                              className="bg-secondary border-border/50 rounded-xl text-sm"
                            />
                          )}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-display font-bold text-foreground">Tu estrategia</h2>
                  <p className="text-sm text-muted-foreground mt-1">Esta información nos ayuda a trabajar mejor para ti. Puedes completarla ahora o más tarde desde tu perfil.</p>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Objetivo principal</label>
                  <div className="grid grid-cols-1 gap-2">
                    {GOALS.map(g => (
                      <button
                        key={g.id}
                        onClick={() => update({ mainGoal: g.id })}
                        className={`flex items-center gap-3 p-3 rounded-xl text-left text-sm transition-all ${
                          data.mainGoal === g.id
                            ? "gold-border bg-primary/10 text-foreground"
                            : "border border-border/30 text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        <span className="text-lg">{g.icon}</span>
                        <span>{g.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Descripción de audiencia ideal</label>
                  <Textarea
                    value={data.targetAudience}
                    onChange={e => update({ targetAudience: e.target.value.slice(0, 200) })}
                    placeholder="Ej: Mujeres de 25-40 años interesadas en nutrición y salud"
                    className="bg-secondary border-border/50 rounded-xl text-sm resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">{data.targetAudience.length}/200</p>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Tono de comunicación</label>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map(t => (
                      <button
                        key={t}
                        onClick={() => {
                          update({ tone: data.tone.includes(t) ? data.tone.filter(x => x !== t) : [...data.tone, t] });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          data.tone.includes(t) ? "gold-gradient text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Pilares de contenido (máx. 5)</label>
                  <div className="flex flex-wrap gap-2">
                    {PILLARS.map(p => (
                      <button
                        key={p}
                        onClick={() => {
                          if (data.contentPillars.includes(p)) {
                            update({ contentPillars: data.contentPillars.filter(x => x !== p) });
                          } else if (data.contentPillars.length < 5) {
                            update({ contentPillars: [...data.contentPillars, p] });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          data.contentPillars.includes(p) ? "gold-gradient text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-display font-bold text-foreground">Sube tu expediente</h2>
                  <p className="text-sm text-muted-foreground mt-1">Si tu consultor ya te preparó un documento con tu estrategia, brief o expediente, súbelo aquí.</p>
                </div>

                {data.blueprintFile ? (
                  <div className="glass gold-border rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{data.blueprintName || "Archivo subido"}</p>
                      <p className="text-xs text-muted-foreground">Listo para guardar</p>
                    </div>
                    <button onClick={() => update({ blueprintFile: null, blueprintName: "" })} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => blueprintRef.current?.click()}
                    className="w-full border-2 border-dashed border-border/50 rounded-xl p-10 flex flex-col items-center gap-3 hover:border-primary/30 hover:bg-secondary/30 transition-all"
                  >
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">PDF, DOCX, DOC — máximo 10MB</p>
                    <p className="text-xs text-primary font-medium">Click para seleccionar archivo</p>
                  </button>
                )}
                <input ref={blueprintRef} type="file" accept=".pdf,.docx,.doc" onChange={handleBlueprintChange} className="hidden" />

                <div className="glass rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground">En futuras versiones, nuestro asistente de IA leerá este documento automáticamente para pre-configurar tu perfil. 🤖</p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="rounded-xl">
              <ChevronLeft className="h-4 w-4 mr-1" /> Atrás
            </Button>
          ) : <div />}

          {step < 3 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext(step)}
              className="gold-gradient text-primary-foreground rounded-xl"
            >
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete} className="gold-gradient text-primary-foreground rounded-xl">
              {editMode ? "Guardar cambios" : "Completar perfil"} <Check className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1.5 block">{label}</label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="bg-secondary border-border/50 rounded-xl" />
    </div>
  );
}
