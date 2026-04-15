import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Mail, Lock, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const passwordValid = password.length >= 8 && /\d/.test(password) && /[A-Z]/.test(password);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Se envió un enlace de recuperación a tu correo");
      setForgotMode(false);
    } catch (err: any) {
      toast.error(err.message || "Error al enviar correo de recuperación");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        toast.success("Sesión iniciada");
      } else {
        if (!passwordValid) { setLoading(false); return; }
        if (password !== confirmPassword) {
          toast.error("Las contraseñas no coinciden");
          setLoading(false);
          return;
        }
        await register(name, email, password);
        toast.success("Cuenta creada. Revisa tu email para confirmar.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

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
                required
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
                  required
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

            <Button
              type="submit"
              disabled={loading || (!isLogin && !passwordValid)}
              className="w-full h-12 gold-gradient text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              {loading ? "Cargando..." : isLogin ? "Entrar" : "Registrarse"}
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
