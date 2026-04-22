import { useState, useRef, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Clock, ArrowRight, ArrowLeft, Mail, Eye, EyeOff, Check,
  HeartPulse, Shirt, PartyPopper, UtensilsCrossed, GraduationCap,
  Briefcase, Laptop, Palette, Sparkles, Instagram, Youtube, Facebook,
  Linkedin, Twitter, MessageCircle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";

// ───────────────────────────────────────── Particles
const GoldenParticles = ({ light }: { light: boolean }) => {
  const particles = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    size: 1 + Math.random() * 3,
    left: Math.random() * 100,
    top: Math.random() * 100,
    duration: 12 + Math.random() * 18,
    delay: Math.random() * -20,
    drift: (Math.random() - 0.5) * 60,
    opacity: (light ? 0.08 : 0.15) + Math.random() * (light ? 0.18 : 0.45),
  }));
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full bg-primary"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
            opacity: p.opacity,
            boxShadow: `0 0 6px hsl(var(--primary) / ${light ? 0.4 : 0.6})`,
            animation: `dv-float ${p.duration}s linear ${p.delay}s infinite`,
            ["--drift" as any]: `${p.drift}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes dv-float {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(var(--drift), -50vh) scale(1.2); }
          100% { transform: translate(calc(var(--drift) * 2), -100vh) scale(0.8); opacity: 0; }
        }
        @keyframes dv-shimmer {
          0% { transform: translateX(-120%) skewX(-20deg); }
          100% { transform: translateX(220%) skewX(-20deg); }
        }
        .dv-shimmer-btn { position: relative; overflow: hidden; }
        .dv-shimmer-btn::after {
          content: ""; position: absolute; top: 0; left: 0; height: 100%; width: 50%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          transform: translateX(-120%) skewX(-20deg);
        }
        .dv-shimmer-btn:hover::after { animation: dv-shimmer 1.1s ease-out; }
        @keyframes dv-burst {
          0% { transform: scale(0); opacity: 0; }
          40% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes dv-spark {
          0% { transform: translate(0,0) scale(0); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }
        }
        @keyframes dv-progress-pulse {
          0% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.7); opacity: 1; }
          100% { box-shadow: 0 0 18px 8px hsl(var(--primary) / 0); opacity: 0; }
        }
        @keyframes dv-sector-shine {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .dv-sector-active {
          background: linear-gradient(120deg,
            hsl(var(--primary) / 0.15) 0%,
            hsl(var(--primary) / 0.28) 50%,
            hsl(var(--primary) / 0.15) 100%);
          background-size: 200% 200%;
          animation: dv-sector-shine 4s ease infinite;
        }
        @keyframes dv-ripple {
          0% { transform: scale(0); opacity: 0.55; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        .dv-ripple {
          position: absolute; inset: 0; margin: auto;
          width: 16px; height: 16px; border-radius: 9999px;
          background: rgba(255,255,255,0.7);
          animation: dv-ripple 0.45s ease-out forwards;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

// ───────────────────────────────────────── Types
interface FormData {
  fullName: string;
  brandName: string;
  photo: string | null;
  businessDescription: string;
  timeInBusiness: string;
  sector: string;
  sectorOther: string;
  socialNetworks: Record<string, string>;
  email: string;
  password: string;
  confirmPassword: string;
}

const TIME_OPTIONS = ["Menos de 1 año", "1 a 3 años", "3 a 5 años", "Más de 5 años"];

const SECTORS = [
  { id: "salud", label: "Salud y bienestar", icon: HeartPulse },
  { id: "moda", label: "Moda y lifestyle", icon: Shirt },
  { id: "eventos", label: "Eventos y hospitalidad", icon: PartyPopper },
  { id: "gastronomia", label: "Gastronomía", icon: UtensilsCrossed },
  { id: "educacion", label: "Educación", icon: GraduationCap },
  { id: "negocios", label: "Negocios y consultoría", icon: Briefcase },
  { id: "tecnologia", label: "Tecnología", icon: Laptop },
  { id: "arte", label: "Arte y entretenimiento", icon: Palette },
  { id: "otro", label: "Otro", icon: Sparkles },
];

const SOCIALS = [
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "tiktok", label: "TikTok", icon: MessageCircle },
  { id: "youtube", label: "YouTube", icon: Youtube },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin },
  { id: "twitter", label: "X (Twitter)", icon: Twitter },
];

const TOTAL_STEPS = 5;

// ───────────────────────────────────────── Page
export default function ClientWelcomePage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [ripple, setRipple] = useState(0);
  const [data, setData] = useState<FormData>({
    fullName: "",
    brandName: "",
    photo: null,
    businessDescription: "",
    timeInBusiness: "",
    sector: "",
    sectorOther: "",
    socialNetworks: {},
    email: "",
    password: "",
    confirmPassword: "",
  });

  const goNext = () => { setDirection(1); setStep((s) => s + 1); };
  const goBack = () => { setDirection(-1); setStep((s) => Math.max(0, s - 1)); };

  const update = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const onPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("photo", reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleSocial = (id: string) => {
    setData((d) => {
      const next = { ...d.socialNetworks };
      if (id in next) delete next[id]; else next[id] = "";
      return { ...d, socialNetworks: next };
    });
  };

  const validateStep = (): boolean => {
    if (step === 1) {
      if (!data.fullName.trim() || !data.brandName.trim()) {
        toast.error("Completa nombre y marca para continuar");
        return false;
      }
    }
    if (step === 2) {
      if (!data.businessDescription.trim() || !data.timeInBusiness) {
        toast.error("Cuéntanos un poco de tu negocio");
        return false;
      }
    }
    if (step === 3) {
      if (!data.sector || (data.sector === "otro" && !data.sectorOther.trim())) {
        toast.error("Selecciona tu sector");
        return false;
      }
    }
    if (step === 5) {
      if (!data.email.trim() || !data.password) {
        toast.error("Email y contraseña son requeridos");
        return false;
      }
      if (data.password.length < 8) {
        toast.error("La contraseña debe tener al menos 8 caracteres");
        return false;
      }
      if (data.password !== data.confirmPassword) {
        toast.error("Las contraseñas no coinciden");
        return false;
      }
    }
    return true;
  };

  const triggerRipple = () => setRipple((r) => r + 1);

  const handleContinue = () => {
    triggerRipple();
    if (!validateStep()) return;
    if (step === 5) return handleSubmit();
    goNext();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const sectorFinal = data.sector === "otro" ? data.sectorOther : data.sector;
      const { error } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            display_name: data.fullName,
            name: data.fullName,
            brand_name: data.brandName,
            business_description: data.businessDescription,
            time_in_business: data.timeInBusiness,
            sector: sectorFinal,
            social_networks: data.socialNetworks,
            onboarding_source: "welcome_link",
          },
        },
      });
      if (error) throw error;
      setDirection(1);
      setStep(6);
    } catch (err: any) {
      toast.error(err.message || "Error al crear la cuenta");
    } finally {
      setSubmitting(false);
    }
  };

  const pwdStrength = (() => {
    const p = data.password;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p) && /[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p) && p.length >= 12) s++;
    return s;
  })();

  const progress = step === 0 ? 0 : step >= 6 ? 100 : (step / TOTAL_STEPS) * 100;

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  const bgClass = isLight ? "bg-[#F8F6F0]" : "bg-[#0A0A0F]";
  const footerBg = isLight ? "bg-[#F8F6F0]/90" : "bg-[#0A0A0F]/90";

  return (
    <div className={cn("min-h-screen w-full text-foreground relative overflow-hidden transition-colors", bgClass)}>
      <GoldenParticles light={isLight} />

      {/* Theme toggle floating */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Progress bar with pulse */}
      <div className={cn("fixed top-0 left-0 right-0 h-1 z-50", isLight ? "bg-black/5" : "bg-white/5")}>
        <motion.div
          className="h-full gold-gradient relative"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        >
          <span
            key={`pulse-${step}`}
            className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary"
            style={{ animation: "dv-progress-pulse 0.4s ease-out forwards" }}
          />
        </motion.div>
      </div>

      {/* Logo */}
      {step !== 0 && step !== 6 && (
        <div className="relative z-10 pt-8 pb-2 text-center">
          <span className="text-lg font-light tracking-[0.3em] bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
            CONSULTORA DV
          </span>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-lg px-5 pb-32 pt-4 min-h-screen flex flex-col">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 80, damping: 20 }}
            className="flex-1 flex flex-col"
          >
            {step === 0 && <StepWelcome onStart={() => { setDirection(1); setStep(1); }} />}
            {step === 1 && (
              <StepIdentity data={data} update={update} onPhoto={onPhoto} />
            )}
            {step === 2 && <StepBusiness data={data} update={update} />}
            {step === 3 && <StepSector data={data} update={update} />}
            {step === 4 && (
              <StepSocials data={data} toggleSocial={toggleSocial} update={update} />
            )}
            {step === 5 && (
              <StepAccess
                data={data} update={update}
                showPwd={showPwd} setShowPwd={setShowPwd}
                pwdStrength={pwdStrength}
              />
            )}
            {step === 6 && <StepFinal email={data.email} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky footer nav */}
      {step > 0 && step < 6 && (
        <div
          className={cn("fixed bottom-0 left-0 right-0 z-40 border-t border-border/30 backdrop-blur-xl", footerBg)}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto max-w-lg px-5 py-4 flex items-center gap-3">
            <button
              onClick={goBack}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Atrás
            </button>
            <div className="flex-1" />
            {step === 4 && (
              <button
                onClick={goNext}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Omitir →
              </button>
            )}
            <Button
              onClick={handleContinue}
              disabled={submitting}
              className="dv-shimmer-btn relative overflow-hidden gold-gradient text-black font-semibold h-12 px-6 rounded-xl hover:opacity-95"
            >
              <AnimatePresence>
                {ripple > 0 && (
                  <motion.span
                    key={ripple}
                    className="dv-ripple"
                    initial={{ opacity: 0.55 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : step === 5 ? (
                <>Crear mi cuenta <ArrowRight className="h-4 w-4 ml-1" /></>
              ) : (
                <>Continuar <ArrowRight className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────── Step 0
function StepWelcome({ onStart }: { onStart: () => void }) {
  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.2, duration: 0.6, ease: "easeOut" as const },
  });
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center min-h-[80vh] py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="text-2xl md:text-3xl font-light tracking-[0.4em] bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent"
      >
        CONSULTORA DV
      </motion.div>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="my-6 h-px w-32 gold-gradient origin-center"
      />
      <motion.h1 {...stagger(2)} className="text-3xl md:text-4xl font-bold leading-tight max-w-md text-balance">
        Acabas de tomar una excelente decisión para tu marca.
      </motion.h1>
      <motion.p {...stagger(3)} className="mt-4 text-muted-foreground max-w-sm">
        Esto se convierte en una colaboración de crecimiento mutuo. Tomémonos 3 minutos para profundizar un poco.
      </motion.p>
      <motion.div {...stagger(4)} className="mt-8 flex items-center gap-2 text-sm text-primary">
        <Clock className="h-4 w-4 animate-pulse" />
        <span className="tracking-wide">5 pasos · menos de 3 minutos</span>
      </motion.div>
      <motion.div {...stagger(5)} className="mt-12">
        <Button
          onClick={onStart}
          className="dv-shimmer-btn gold-gradient text-black font-semibold h-14 px-10 rounded-xl text-base hover:opacity-95"
        >
          Comenzar mi registro <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}

// ───────────────────────────────────────── Reusable header (with flip)
function StepHeader({ num, title, subtitle }: { num: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-8 mt-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={num}
          initial={{ rotateX: 90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: -90, opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          style={{ transformPerspective: 600, transformStyle: "preserve-3d" }}
          className="text-xs tracking-[0.3em] text-primary mb-2 inline-block"
        >
          {num}
        </motion.div>
      </AnimatePresence>
      <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
      {subtitle && <p className="text-muted-foreground text-sm mt-2">{subtitle}</p>}
    </div>
  );
}

// ───────────────────────────────────────── Step 1
function StepIdentity({
  data, update, onPhoto,
}: {
  data: FormData;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  onPhoto: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <StepHeader num="01 / 05" title="¿Cómo te llamas?" />

      <div className="space-y-6">
        <div className="relative">
          <Label className="text-sm text-muted-foreground">Nombre completo *</Label>
          <Input
            value={data.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            placeholder="Ej. Bianca Aldama"
            className="mt-2 bg-secondary border-border/50 rounded-xl h-12 focus:border-primary/50"
          />
          {data.fullName && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 0.2, y: 0 }}
              className="pointer-events-none absolute right-3 -bottom-7 text-2xl italic text-primary font-serif tracking-wide"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {data.fullName}
            </motion.div>
          )}
        </div>

        <div className="pt-4">
          <Label className="text-sm text-muted-foreground">
            Nombre de tu marca *
          </Label>
          <Input
            value={data.brandName}
            onChange={(e) => update("brandName", e.target.value)}
            placeholder="Ej. Bianca Aldama Boutique"
            className="mt-2 bg-secondary border-border/50 rounded-xl h-12 focus:border-primary/50"
          />
        </div>

        <div className="flex flex-col items-center pt-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative h-28 w-28 rounded-full glass gold-border flex items-center justify-center overflow-hidden hover:scale-105 transition-transform"
          >
            {data.photo ? (
              <img src={data.photo} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-8 w-8 text-primary" />
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground"
          >
            {data.photo ? "Cambiar foto" : "Agregar foto (opcional)"}
          </button>
          {data.photo && (
            <button
              type="button"
              onClick={() => update("photo", null)}
              className="mt-1 text-xs text-muted-foreground/70 hover:text-foreground"
            >
              Omitir foto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────── Step 2
function StepBusiness({
  data, update,
}: {
  data: FormData;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <div>
      <StepHeader num="02 / 05" title="Cuéntame de tu negocio" />
      <div className="space-y-6">
        <div>
          <Label className="text-sm text-muted-foreground">¿A qué te dedicas?</Label>
          <Textarea
            value={data.businessDescription}
            onChange={(e) => update("businessDescription", e.target.value.slice(0, 120))}
            placeholder="Ej. Tengo una boutique de moda y calzado femenino en Zapopan"
            rows={3}
            className="mt-2 bg-secondary border-border/50 rounded-xl focus:border-primary/50 resize-none"
          />
          <div className="text-right text-xs text-muted-foreground mt-1">
            {data.businessDescription.length}/120
          </div>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground">¿Cuánto tiempo llevas en esto?</Label>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {TIME_OPTIONS.map((opt) => {
              const active = data.timeInBusiness === opt;
              return (
                <motion.button
                  key={opt}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => update("timeInBusiness", opt)}
                  className={cn(
                    "relative h-16 rounded-xl border text-sm font-medium transition-all",
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/50 bg-secondary text-muted-foreground hover:border-border"
                  )}
                >
                  {opt}
                  {active && (
                    <motion.span
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute top-2 right-2 h-5 w-5 rounded-full gold-gradient flex items-center justify-center"
                    >
                      <Check className="h-3 w-3 text-black" />
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────── Step 3
function StepSector({
  data, update,
}: {
  data: FormData;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <div>
      <StepHeader
        num="03 / 05"
        title="¿En qué mundo vives?"
        subtitle="Selecciona el que más represente tu negocio"
      />
      <div className="grid grid-cols-2 gap-3">
        {SECTORS.map((s, i) => {
          const Icon = s.icon;
          const active = data.sector === s.id;
          return (
            <motion.button
              key={s.id}
              type="button"
              initial={{ opacity: 0, y: 14 }}
              animate={active ? { opacity: 1, y: 0, scale: [1, 1.05, 1] } : { opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.06, duration: 0.4, ease: "easeOut" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => update("sector", s.id)}
              className={cn(
                "relative h-28 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all overflow-hidden",
                active
                  ? "border-primary dv-sector-active shadow-[0_0_24px_-6px_hsl(var(--primary)/0.5)]"
                  : "border-border/50 bg-secondary hover:border-border"
              )}
            >
              <Icon className={cn("h-7 w-7 relative z-10", active ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-xs text-center px-1 relative z-10", active ? "text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence>
        {data.sector === "otro" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-4"
          >
            <Input
              value={data.sectorOther}
              onChange={(e) => update("sectorOther", e.target.value)}
              placeholder="Cuéntanos a qué te dedicas"
              className="bg-secondary border-border/50 rounded-xl h-12 focus:border-primary/50"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────────────────────── Step 4
function StepSocials({
  data, toggleSocial, update,
}: {
  data: FormData;
  toggleSocial: (id: string) => void;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <div>
      <StepHeader
        num="04 / 05"
        title="¿Dónde tienes presencia?"
        subtitle="Opcional — puedes completarlo después"
      />
      <div className="grid grid-cols-3 gap-3">
        {SOCIALS.map((s) => {
          const Icon = s.icon;
          const active = s.id in data.socialNetworks;
          return (
            <motion.button
              key={s.id}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleSocial(s.id)}
              className={cn(
                "h-20 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all",
                active
                  ? "border-primary bg-primary/10"
                  : "border-border/50 bg-secondary hover:border-border"
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[10px]", active ? "text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
            </motion.button>
          );
        })}
      </div>
      <div className="mt-5 space-y-3">
        <AnimatePresence>
          {SOCIALS.filter((s) => s.id in data.socialNetworks).map((s) => (
            <motion.div
              key={s.id}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Input
                value={data.socialNetworks[s.id] || ""}
                onChange={(e) =>
                  update("socialNetworks", { ...data.socialNetworks, [s.id]: e.target.value })
                }
                placeholder={`@usuario de ${s.label}`}
                className="bg-secondary border-border/50 rounded-xl h-11 focus:border-primary/50"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ───────────────────────────────────────── Step 5
function StepAccess({
  data, update, showPwd, setShowPwd, pwdStrength,
}: {
  data: FormData;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  showPwd: boolean;
  setShowPwd: (v: boolean) => void;
  pwdStrength: number;
}) {
  return (
    <div>
      <StepHeader num="05 / 05" title="Crea tu acceso exclusivo" />
      <div className="space-y-5">
        <div>
          <Label className="text-sm text-muted-foreground">Email *</Label>
          <div className="relative mt-2">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              value={data.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="tu@correo.com"
              className="bg-secondary border-border/50 rounded-xl h-12 pl-10 focus:border-primary/50"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground">Contraseña *</Label>
          <div className="relative mt-2">
            <Input
              type={showPwd ? "text" : "password"}
              value={data.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="bg-secondary border-border/50 rounded-xl h-12 pr-10 focus:border-primary/50"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all",
                  i < pwdStrength
                    ? pwdStrength === 1 ? "bg-red-500/70"
                    : pwdStrength === 2 ? "bg-yellow-500/70"
                    : "bg-primary"
                    : "bg-border/40"
                )}
              />
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground">Confirmar contraseña *</Label>
          <Input
            type={showPwd ? "text" : "password"}
            value={data.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            placeholder="Repite tu contraseña"
            className="mt-2 bg-secondary border-border/50 rounded-xl h-12 focus:border-primary/50"
          />
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed pt-2">
          Con este correo y contraseña accederás a tu panel exclusivo de Consultora DV.
          Tu cuenta será activada por el equipo en las próximas horas.
        </p>
      </div>
    </div>
  );
}

// ───────────────────────────────────────── Step 6 (with explosion of particles)
function StepFinal({ email }: { email: string }) {
  const sparks = Array.from({ length: 14 });
  const explosion = Array.from({ length: 28 }).map((_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 120 + Math.random() * 220;
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      size: 4 + Math.random() * 6,
      delay: Math.random() * 0.15,
      duration: 0.9 + Math.random() * 0.4,
    };
  });

  return (
    <div className="flex-1 flex flex-col items-center text-center justify-center py-16 min-h-[80vh] relative">
      {/* Big screen particle explosion */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        {explosion.map((p) => (
          <motion.span
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
            animate={{ x: p.x, y: p.y, opacity: 0, scale: 1.2 }}
            transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
            className="absolute rounded-full bg-primary"
            style={{
              width: p.size,
              height: p.size,
              boxShadow: "0 0 12px hsl(var(--primary))",
            }}
          />
        ))}
      </div>

      <div className="relative h-28 w-28 mb-8 z-10">
        <div
          className="absolute inset-0 rounded-full gold-gradient flex items-center justify-center"
          style={{ animation: "dv-burst 0.9s cubic-bezier(.34,1.56,.64,1) forwards" }}
        >
          <Check className="h-14 w-14 text-black" strokeWidth={3} />
        </div>
        {sparks.map((_, i) => {
          const angle = (i / sparks.length) * Math.PI * 2;
          const r = 80 + Math.random() * 40;
          return (
            <span
              key={i}
              className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full bg-primary"
              style={{
                ["--tx" as any]: `${Math.cos(angle) * r}px`,
                ["--ty" as any]: `${Math.sin(angle) * r}px`,
                animation: `dv-spark 1.1s ease-out ${0.3 + i * 0.02}s forwards`,
                boxShadow: "0 0 8px hsl(var(--primary))",
              }}
            />
          );
        })}
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-3xl md:text-4xl font-bold relative z-10"
      >
        ¡Ya eres parte de Consultora DV!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-4 text-muted-foreground max-w-sm relative z-10"
      >
        Revisa tu correo <span className="text-primary font-medium">{email}</span> para
        confirmar tu cuenta. En cuanto el equipo la active, tendrás acceso a tu panel exclusivo.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="mt-8 w-full max-w-sm glass gold-border rounded-2xl p-5 space-y-3 text-left relative z-10"
      >
        <div className="flex items-start gap-3 text-sm">
          <Mail className="h-5 w-5 text-primary mt-0.5" />
          <span>Revisa tu bandeja de entrada (y spam por si acaso)</span>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <Clock className="h-5 w-5 text-primary mt-0.5" />
          <span>Activación en menos de 24 horas</span>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <MessageCircle className="h-5 w-5 text-primary mt-0.5" />
          <span>¿Dudas? Escríbenos por WhatsApp</span>
        </div>
      </motion.div>

      <motion.a
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        href={`https://wa.me/5216682343672?text=${encodeURIComponent("Hola Dante, acabo de registrarme en el panel de Consultora DV.")}`}
        target="_blank" rel="noopener noreferrer"
        className="dv-shimmer-btn mt-8 inline-flex items-center gap-2 gold-gradient text-black font-semibold h-13 px-8 py-3 rounded-xl hover:opacity-95 relative z-10"
      >
        <MessageCircle className="h-5 w-5" />
        Escribir por WhatsApp
      </motion.a>
    </div>
  );
}
