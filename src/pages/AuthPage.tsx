import { useState } from "react";
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

export default function AuthPage() {
  const { login, loginAsClient, register, isPending } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [devRole, setDevRole] = useState<UserRole>("admin");
  const [devCliente, setDevCliente] = useState(clients[0].id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      if (devRole === "cliente") {
        loginAsClient(devCliente);
      } else {
        login(email, password, devRole);
      }
    } else {
      if (password !== confirmPassword) return;
      register(name, email, password);
    }
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
              className="w-full h-12 gold-gradient text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              {isLogin ? "Entrar" : "Registrarse"}
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
