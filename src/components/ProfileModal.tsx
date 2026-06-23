import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { X, Lock, Eye, EyeOff, Camera, Instagram, Music2, Facebook, Twitter, Globe, Phone, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PushSetupCard } from "@/components/PushSetupCard";

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
  const [phone, setPhone] = useState(user?.phone || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [instagram, setInstagram] = useState(user?.socialLinks?.instagram || "");
  const [tiktok, setTiktok]       = useState(user?.socialLinks?.tiktok || "");
  const [facebook, setFacebook]   = useState(user?.socialLinks?.facebook || "");
  const [twitter, setTwitter]     = useState(user?.socialLinks?.twitter || "");
  const [website, setWebsite]     = useState(user?.socialLinks?.website || "");
  const [showSocial, setShowSocial] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Photo — URL for preview (from Storage or local blob), file for pending upload
  const [photo, setPhoto] = useState<string | null>(user?.customAvatar || null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

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
    if (file.size > 2 * 1024 * 1024) { toast.error("La imagen no puede superar 2MB"); return; }
    setPhotoFile(file);
    setPhoto(URL.createObjectURL(file));
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
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
      setSaving(true);
      setPwError("");
      try {
        // Verificar contraseña actual antes de cambiar
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user?.email || "",
          password: currentPw,
        });
        if (signInError) {
          setPwError("La contraseña actual es incorrecta");
          setSaving(false);
          return;
        }
        const { error } = await supabase.auth.updateUser({ password: newPw });
        if (error) {
          setPwError(error.message);
          setSaving(false);
          return;
        }
        toast.success("Contraseña actualizada");
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
      } catch (err: any) {
        setPwError(err.message || "Error al cambiar contraseña");
        setSaving(false);
        return;
      }
    }

    // Upload new photo to Supabase Storage if changed
    let avatarUrl: string | undefined = undefined;
    if (photoFile && user?.id) {
      const ext = photoFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}_avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, photoFile, { upsert: true });
      if (upErr) {
        toast.error("Error subiendo foto de perfil");
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      avatarUrl = urlData.publicUrl;
    }

    const socialLinks = {
      ...(instagram.trim() && { instagram: instagram.trim() }),
      ...(tiktok.trim()    && { tiktok:    tiktok.trim() }),
      ...(facebook.trim()  && { facebook:  facebook.trim() }),
      ...(twitter.trim()   && { twitter:   twitter.trim() }),
      ...(website.trim()   && { website:   website.trim() }),
    };

    await updateProfile({
      name, email,
      phone: phone.trim() || undefined,
      bio:   bio.trim() || undefined,
      socialLinks,
      ...(avatarUrl !== undefined ? { customAvatar: avatarUrl } : {}),
    });
    setSaving(false);
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

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
              <Phone className="h-3 w-3" /> Teléfono / WhatsApp <span className="text-[10px] opacity-60">(opcional)</span>
            </label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 1 555 123 4567"
              className="bg-secondary border-border/50 rounded-xl" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Bio / Descripción <span className="text-[10px] opacity-60">(opcional)</span>
            </label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)}
              rows={2} maxLength={200}
              placeholder="Editora de video especializada en…"
              className="w-full px-3 py-2 bg-secondary border border-border/50 rounded-xl text-sm focus:outline-none focus:border-primary/50 resize-none" />
            <p className="text-[10px] text-muted-foreground/60 mt-1 text-right">{bio.length}/200</p>
          </div>

          {/* Redes sociales (colapsable) */}
          <div className="border-t border-border/30 pt-4">
            <button type="button" onClick={() => setShowSocial((s) => !s)}
              className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              <span>Redes sociales (opcional)</span>
              {showSocial ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showSocial && (
              <div className="space-y-2 mt-3">
                <SocialField icon={<Instagram className="h-3.5 w-3.5" />} placeholder="@usuario" value={instagram} onChange={setInstagram} label="Instagram" />
                <SocialField icon={<Music2 className="h-3.5 w-3.5" />}    placeholder="@usuario" value={tiktok}    onChange={setTiktok}    label="TikTok" />
                <SocialField icon={<Facebook className="h-3.5 w-3.5" />}  placeholder="usuario o URL" value={facebook} onChange={setFacebook} label="Facebook" />
                <SocialField icon={<Twitter className="h-3.5 w-3.5" />}   placeholder="@usuario" value={twitter}   onChange={setTwitter}   label="Twitter / X" />
                <SocialField icon={<Globe className="h-3.5 w-3.5" />}     placeholder="https://…" value={website}   onChange={setWebsite}   label="Sitio web" />
              </div>
            )}
          </div>

          {/* Notificaciones push en este dispositivo */}
          <div className="border-t border-border/30 pt-4">
            <label className="text-xs text-muted-foreground mb-2 block font-medium">Notificaciones</label>
            <PushSetupCard variant="card" />
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
          <Button onClick={handleSave} disabled={saving} className="w-full gold-gradient text-primary-foreground rounded-xl h-11">
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SocialField({ icon, label, placeholder, value, onChange }: {
  icon: React.ReactNode; label: string; placeholder: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary text-muted-foreground shrink-0" title={label}>
        {icon}
      </div>
      <Input value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-secondary border-border/50 rounded-xl h-9 text-sm" />
    </div>
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
