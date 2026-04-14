import { useState } from "react";
import { motion } from "framer-motion";
import { X, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

const roleBadgeColors: Record<string, string> = {
  admin: "gold-gradient text-primary-foreground",
  editor: "bg-status-published/20 text-status-published",
  "diseñador": "bg-status-changes/20 text-status-changes",
  cliente: "bg-secondary text-muted-foreground",
};

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  const handleSave = () => {
    updateProfile({ name, email });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass gold-border gold-glow rounded-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-display text-lg font-semibold text-foreground">Mi Perfil</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full gold-gradient flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {user?.avatar}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Nombre completo</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border/50 rounded-xl" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary border-border/50 rounded-xl" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-2">
              Rol <Lock className="h-3 w-3" />
            </label>
            <div className="flex items-center gap-2 p-3 bg-secondary/50 border border-border/50 rounded-xl">
              <Badge className={roleBadgeColors[user?.role || "cliente"]}>
                {(user?.role || "cliente").toUpperCase()}
              </Badge>
              <span className="text-xs text-muted-foreground">Solo el administrador puede modificar tu rol.</span>
            </div>
          </div>
          <Button onClick={handleSave} className="w-full gold-gradient text-primary-foreground rounded-xl h-11">
            Guardar cambios
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
