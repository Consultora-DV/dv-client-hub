import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Lock, Eye, EyeOff, Camera } from "lucide-react";
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
  const fileRef = useRef<HTMLInputElement>(null);

  // Photo
  const photoKey = `dv_user_profile_photo_${user?.id}`;
  const [photo, setPhoto] = useState<string | null>(() => localStorage.getItem(photoKey));

  // Password fields
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwError, setPwError] = useState("");

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("La imagen no puede superar 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    // Password validation
    const anyPwFilled = currentPw || newPw || confirmPw;
    if (anyPwFilled) {
      if (!currentPw || !newPw || !confirmPw) {
        setPwError("Completa los tres campos de contraseña");
        return;
      }
      if (newPw !== confirmPw) {
        setPwError("Las contraseñas no coinciden");
        return;
      }
      localStorage.setItem(`dv_user_password_${user?.id}`, newPw);
    }

    // Save photo
    if (photo) {
      localStorage.setItem(photoKey, photo);
    } else {
      localStorage.removeItem(photoKey);
    }

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
        className="glass gold-border gold-glow rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-display text-lg font-semibold text-foreground">Mi Perfil</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Avatar / Photo uploader */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-20 h-20 rounded-full overflow-hidden group"
            >
              {photo ? (
                <img src={photo} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full gold-gradient flex items-center justify-center text-2xl font-bold text-primary-foreground">
                  {user?.avatar}
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" onChange={handlePhotoChange} className="hidden" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Nombre completo</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border/50 rounded-xl" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary border-border/50 rounded-xl" />
          </div>

          {/* Change password section */}
          <div className="border-t border-border/50 pt-4">
            <label className="text-xs text-muted-foreground mb-3 block font-medium">Cambiar contraseña</label>
            <div className="space-y-3">
              <PasswordField label="Contraseña actual" value={currentPw} onChange={setCurrentPw} show={showCurrent} toggleShow={() => setShowCurrent(!showCurrent)} />
              <PasswordField label="Nueva contraseña" value={newPw} onChange={setNewPw} show={showNew} toggleShow={() => setShowNew(!showNew)} />
              <PasswordField label="Confirmar nueva contraseña" value={confirmPw} onChange={setConfirmPw} show={showConfirm} toggleShow={() => setShowConfirm(!showConfirm)} />
              {pwError && <p className="text-xs text-destructive">{pwError}</p>}
            </div>
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

function PasswordField({ label, value, onChange, show, toggleShow }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; toggleShow: () => void;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-secondary border-border/50 rounded-xl pr-10"
        />
        <button type="button" onClick={toggleShow} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
