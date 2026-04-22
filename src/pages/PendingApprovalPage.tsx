import { motion } from "framer-motion";
import { Clock, LogOut, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function PendingApprovalPage() {
  const { user, logout } = useAuth();

  const particles = Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    size: 1 + Math.random() * 3,
    left: Math.random() * 100,
    top: Math.random() * 100,
    duration: 14 + Math.random() * 16,
    delay: Math.random() * -20,
    drift: (Math.random() - 0.5) * 60,
    opacity: 0.15 + Math.random() * 0.4,
  }));

  return (
    <div className="min-h-screen w-full text-foreground relative overflow-hidden bg-background">
      {/* Particles */}
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
              boxShadow: `0 0 6px hsl(var(--primary) / 0.6)`,
              animation: `pap-float ${p.duration}s linear ${p.delay}s infinite`,
              ["--drift" as any]: `${p.drift}px`,
            }}
          />
        ))}
        <style>{`
          @keyframes pap-float {
            0%   { transform: translate(0, 0) scale(1); }
            50%  { transform: translate(var(--drift), -50vh) scale(1.2); }
            100% { transform: translate(calc(var(--drift) * 2), -100vh) scale(0.8); opacity: 0; }
          }
          @keyframes pap-pulse-ring {
            0%   { transform: scale(0.9); opacity: 0.7; }
            100% { transform: scale(1.6); opacity: 0; }
          }
        `}</style>
      </div>

      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass gold-border gold-glow rounded-3xl max-w-lg w-full p-8 md:p-10 text-center"
        >
          {/* Animated icon */}
          <div className="relative mx-auto mb-6 w-20 h-20 flex items-center justify-center">
            <span
              className="absolute inset-0 rounded-full bg-primary/30"
              style={{ animation: "pap-pulse-ring 2s ease-out infinite" }}
            />
            <span
              className="absolute inset-0 rounded-full bg-primary/20"
              style={{ animation: "pap-pulse-ring 2s ease-out 1s infinite" }}
            />
            <div className="relative w-20 h-20 rounded-full gold-gradient flex items-center justify-center shadow-xl">
              <Clock className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
                Cuenta en revisión
              </span>
              <Sparkles className="w-4 h-4 text-primary" />
            </div>

            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
              ¡Bienvenido{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
            </h1>

            <p className="text-sm md:text-base text-muted-foreground mb-2 leading-relaxed">
              Hemos recibido tu registro y nuestro equipo está revisando tu información.
            </p>
            <p className="text-sm md:text-base text-muted-foreground mb-6 leading-relaxed">
              En las próximas horas activaremos tu acceso al panel y te notificaremos por correo.
            </p>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-muted-foreground mb-1">Cuenta registrada</p>
              <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href="https://wa.me/5216682343672?text=Hola%2C%20acabo%20de%20registrarme%20y%20quisiera%20agilizar%20la%20aprobaci%C3%B3n"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Contactar consultor
                </Button>
              </a>
              <Button onClick={logout} variant="ghost" className="flex-1 gap-2 text-muted-foreground">
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
