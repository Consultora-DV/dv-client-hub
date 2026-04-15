import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { clients } from "@/data/mockData";
import { motion } from "framer-motion";
import { Mail, Lock, User, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const devRoles: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin (Consultora DV)" },
  { value: "editor", label: "Editor" },
  { value: "diseñador", label: "Diseñador" },
  { value: "cliente", label: "Cliente" },
];

function PasswordStrength({ password }: { password: string }) {
  const checks = useMemo(() => ({
    minLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasUpper: /[A-Z]/.test(password),
  }), [password]);

  const score = [checks.minLength, checks.hasNumber, checks.hasUpper].filter(Boolean).length;
  const labels = ["Débil", "Débil", "Media", "Fuerte"];
  const colors = ["bg-destructive", "bg-destructive", "bg-status-pending", "bg-status-approved"];

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? colors[score] : "bg-secondary"}`} />
        ))}
      </div>
      <p className={`text-xs ${score <= 1 ? "text-destructive" : score === 2 ? "text-status-pending" : "text-status-approved"}`}>
        {labels[score]}
      </p>
      {score < 3 && (
        <p className="text-xs text-muted-foreground">
          La contraseña debe tener al menos 8 caracteres, 1 número y 1 mayúscula
        </p>
      )}
    </div>
  );
}

export default function AuthPage() {
  const { login, loginAsClient, register, isPending } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [devRole, setDevRole] = useState<UserRole>("admin");
  const [devCliente, setDevCliente] = useState(clients[0].id);

  const passwordValid = password.length >= 8 && /\d/.test(password) && /[A-Z]/.test(password);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      if (devRole === "cliente") {
        loginAsClient(devCliente);
      } else {
        login(email, password, devRole);
      }
    } else {
      if (!passwordValid) return;
      if (password !== confirmPassword) return;
      register(name, email, password);
    }
  };

  const handleGoogleLogin = () => {
    toast.info("Google login estará disponible pronto. Regístrate con email por ahora.");
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative text-center max-w-md mx-4">
          <div className="w-20 h-20 rounded-full gold-gradient flex items-center justify-center text-2xl font-bold text-primary-foreground mx-auto mb-6">
            DV
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-3">Cuenta en revisión</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Tu cuenta está siendo revisada. El equipo de Consultora DV te dará acceso pronto.
          </p>
          <a
            href="https://wa.me/5216682343672?text=Hola%2C%20me%20registré%20en%20el%20panel%20y%20estoy%20esperando%20aprobación"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-status-approved/15 text-status-approved hover:bg-status-approved/25 transition-colors text-sm font-medium"
          >
            <MessageCircle className="h-5 w-5" /> Contactar por WhatsApp
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-md mx-4"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-display font-bold gold-text">Consultora DV</h1>
          <p className="text-muted-foreground mt-2 text-sm">Panel de Clientes</p>
        </div>

        <div className="glass gold-border rounded-2xl p-8 gold-glow">
          <h2 className="text-xl font-semibold text-foreground mb-6 text-center">
            {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-12 bg-secondary border-border/50 rounded-xl focus:border-primary/50"
                  required
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 bg-secondary border-border/50 rounded-xl focus:border-primary/50"
              />
            </div>
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 bg-secondary border-border/50 rounded-xl focus:border-primary/50"
                />
              </div>
              {!isLogin && <PasswordStrength password={password} />}
            </div>
            {!isLogin && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Confirmar contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-12 bg-secondary border-border/50 rounded-xl focus:border-primary/50"
                  required
                />
              </div>
            )}

            {isLogin && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Rol (desarrollo)</label>
                  <Select value={devRole} onValueChange={(v) => setDevRole(v as UserRole)}>
                    <SelectTrigger className="h-12 bg-secondary border-border/50 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass gold-border">
                      {devRoles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {devRole === "cliente" && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Cliente</label>
                    <Select value={devCliente} onValueChange={setDevCliente}>
                      <SelectTrigger className="h-12 bg-secondary border-border/50 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass gold-border">
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <Button
              type="submit"
              disabled={!isLogin && !passwordValid}
              className="w-full h-12 gold-gradient text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              {isLogin ? "Entrar" : "Registrarse"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              className="w-full h-12 border-border/50 rounded-xl text-foreground hover:bg-secondary"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continuar con Google
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline">
              {isLogin ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
