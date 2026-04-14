import { useState } from "react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Mail, Lock, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const roles: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin (Dante)" },
  { value: "editor", label: "Editor" },
  { value: "diseñador", label: "Diseñador" },
  { value: "cliente", label: "Cliente" },
];

export default function AuthPage() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("cliente");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password, role);
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

          <Button
            onClick={() => login("google", "", role)}
            className="w-full h-12 gold-gradient text-primary-foreground font-semibold rounded-xl mb-6 hover:opacity-90 transition-opacity"
          >
            Continuar con Google
          </Button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">o con email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-12 bg-secondary border-border/50 rounded-xl focus:border-primary/50"
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

            {/* Role selector for dev */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Rol (desarrollo)</label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger className="h-12 bg-secondary border-border/50 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass gold-border">
                  {roles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              variant="outline"
              className="w-full h-12 rounded-xl border-primary/30 text-foreground hover:bg-primary/10 hover:border-primary/50"
            >
              {isLogin ? "Entrar" : "Registrarse"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
