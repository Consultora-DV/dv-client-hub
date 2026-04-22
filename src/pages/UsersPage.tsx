import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, UserRole, ApprovalStatus } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCog, UserPlus, X, Mail, Copy, Check, Clock, ShieldCheck, Ban, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ManagedUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  approvalStatus: ApprovalStatus;
}

const roleBadges: Record<string, { label: string; class: string }> = {
  admin: { label: "ADMIN", class: "gold-gradient text-primary-foreground" },
  editor: { label: "EDITOR", class: "bg-status-published/20 text-status-published border-status-published/30" },
  diseñador: { label: "DISEÑADOR", class: "bg-status-changes/20 text-status-changes border-status-changes/30" },
  cliente: { label: "CLIENTE", class: "bg-secondary text-muted-foreground" },
};

const approvalBadges: Record<ApprovalStatus, { label: string; class: string }> = {
  pending: { label: "PENDIENTE", class: "bg-status-pending/20 text-status-pending border border-status-pending/40" },
  approved: { label: "APROBADO", class: "bg-status-approved/20 text-status-approved border border-status-approved/40" },
  rejected: { label: "RECHAZADO", class: "bg-destructive/20 text-destructive border border-destructive/40" },
};

function EditUserModal({ user, onClose, onSave }: {
  user: ManagedUser;
  onClose: () => void;
  onSave: (userId: string, role: UserRole) => void;
}) {
  const [role, setRole] = useState<UserRole>(user.role);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} className="glass gold-border gold-glow rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-display text-lg font-semibold text-foreground">Editar usuario</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
            <p className="text-sm text-foreground">{user.name}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <p className="text-sm text-foreground">{user.email}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Rol</label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger className="bg-secondary border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="glass gold-border">
                <SelectItem value="cliente">Cliente</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="diseñador">Diseñador</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={() => onSave(user.user_id, role)} className="flex-1 gold-gradient text-primary-foreground">Guardar</Button>
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function InviteUserModal({ onClose, onInvited }: {
  onClose: () => void;
  onInvited: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("cliente");
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error("Ingresa un email válido");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: email.trim(), name: name.trim() || undefined, role },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const link = `${window.location.origin}/auth`;
      setInviteLink(link);
      toast.success(`Usuario ${email} registrado exitosamente`);
      onInvited();
    } catch (err: any) {
      toast.error("Error: " + (err.message || "No se pudo crear el usuario"));
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link copiado al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} className="glass gold-border gold-glow rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-display text-lg font-semibold text-foreground">Agregar usuario</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {!inviteLink ? (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Nombre completo</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: María García"
                  className="bg-secondary border-border/50 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Email *</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  className="bg-secondary border-border/50 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Rol</label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                  <SelectTrigger className="bg-secondary border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="glass gold-border">
                    <SelectItem value="cliente">Cliente</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="diseñador">Diseñador</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Se creará la cuenta y se enviará un email de confirmación al usuario.
              </p>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleInvite} disabled={loading} className="flex-1 gold-gradient text-primary-foreground">
                  {loading ? "Creando..." : "Crear usuario"}
                </Button>
                <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-status-published/10 border border-status-published/20">
                <Check className="h-5 w-5 text-status-published shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">¡Usuario creado exitosamente!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Se envió un email de confirmación a <strong>{email}</strong></p>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Link de acceso al panel</label>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="bg-secondary border-border/50 rounded-xl text-xs" />
                  <Button variant="outline" size="icon" onClick={copyLink} className="shrink-0">
                    {copied ? <Check className="h-4 w-4 text-status-published" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                El usuario deberá confirmar su email y luego podrá iniciar sesión. Su contraseña temporal fue generada automáticamente — puede usar "Olvidé mi contraseña" para crear la suya.
              </p>
              <Button onClick={onClose} className="w-full" variant="outline">Cerrar</Button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*");
    if (!profiles) { setLoading(false); return; }

    const userIds = profiles.map((p) => p.user_id);
    const { data: allRoles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    const roleMap = new Map<string, string>();
    allRoles?.forEach((r) => roleMap.set(r.user_id, r.role));

    const managed: ManagedUser[] = profiles.map((p: any) => ({
      id: p.id,
      user_id: p.user_id,
      name: p.display_name || p.email || "Usuario",
      email: p.email || "",
      role: (roleMap.get(p.user_id) as UserRole) ?? "cliente",
      approvalStatus: (p.approval_status as ApprovalStatus) ?? "approved",
    }));

    // Pendientes primero, luego rechazados, luego aprobados
    const order: Record<ApprovalStatus, number> = { pending: 0, rejected: 1, approved: 2 };
    managed.sort((a, b) => order[a.approvalStatus] - order[b.approvalStatus]);

    setUsers(managed);
    setLoading(false);
  };

  const handleSaveRole = async (userId: string, role: UserRole) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) {
      toast.error("Error al actualizar rol: " + error.message);
    } else {
      toast.success("Rol actualizado");
      loadUsers();
    }
    setEditingUser(null);
  };

  const handleApprove = async (userId: string, status: ApprovalStatus) => {
    const { error } = await supabase
      .from("profiles")
      .update({ approval_status: status })
      .eq("user_id", userId);
    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success(status === "approved" ? "Usuario aprobado ✓" : status === "rejected" ? "Usuario rechazado" : "Estado actualizado");
      loadUsers();
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId: deletingUser.user_id },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success(`Usuario ${deletingUser.name} eliminado`);
      setDeletingUser(null);
      loadUsers();
    } catch (err: any) {
      toast.error("Error al eliminar: " + (err.message || "intenta de nuevo"));
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <p className="text-muted-foreground">Cargando usuarios...</p>
      </div>
    );
  }

  const pendingCount = users.filter((u) => u.approvalStatus === "pending").length;
  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Gestión de Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-1">Administra roles y aprobaciones de usuarios</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowInvite(true)} className="gold-gradient text-primary-foreground gap-2">
            <UserPlus className="h-4 w-4" />
            Agregar usuario
          </Button>
        )}
      </motion.div>

      {pendingCount > 0 && isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass gold-border rounded-xl p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-status-pending/20 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-status-pending" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {pendingCount} {pendingCount === 1 ? "usuario pendiente" : "usuarios pendientes"} de aprobación
            </p>
            <p className="text-xs text-muted-foreground">Revisa y aprueba para que puedan acceder al panel.</p>
          </div>
        </motion.div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block glass gold-border rounded-xl overflow-hidden">
        {users.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground text-center">No hay usuarios registrados aún.</p>
        )}
        {users.map((u) => {
          const badge = roleBadges[u.role];
          const ab = approvalBadges[u.approvalStatus];
          const isPending = u.approvalStatus === "pending";
          return (
            <div
              key={u.id}
              className={`flex items-center gap-4 px-5 py-4 border-b border-border/30 last:border-0 ${isPending ? "bg-status-pending/5" : ""}`}
            >
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground">
                {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Badge className={`text-[9px] ${ab.class}`}>{ab.label}</Badge>
              {badge && <Badge className={`text-[9px] ${badge.class}`}>{badge.label}</Badge>}
              {isAdmin && (
                <div className="flex items-center gap-1">
                  {isPending && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(u.user_id, "approved")}
                        className="h-8 gap-1 gold-gradient text-primary-foreground text-xs"
                      >
                        <Check className="h-3 w-3" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleApprove(u.user_id, "rejected")}
                        className="h-8 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                      >
                        <Ban className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  {u.approvalStatus === "approved" && (
                    <button
                      onClick={() => handleApprove(u.user_id, "rejected")}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Revocar acceso"
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                  )}
                  {u.approvalStatus === "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApprove(u.user_id, "approved")}
                      className="h-8 gap-1 text-xs"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      Reactivar
                    </Button>
                  )}
                  <button
                    onClick={() => setEditingUser(u)}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title="Editar rol"
                  >
                    <UserCog className="h-4 w-4" />
                  </button>
                  {u.user_id !== currentUser?.id && (
                    <button
                      onClick={() => setDeletingUser(u)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {users.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground text-center">No hay usuarios registrados aún.</p>
        )}
        {users.map((u) => {
          const badge = roleBadges[u.role];
          const ab = approvalBadges[u.approvalStatus];
          const isPending = u.approvalStatus === "pending";
          return (
            <div key={u.id} className={`glass gold-border rounded-xl p-4 space-y-3 ${isPending ? "ring-1 ring-status-pending/30" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
                  {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-[9px] ${ab.class}`}>{ab.label}</Badge>
                {badge && <Badge className={`text-[9px] ${badge.class}`}>{badge.label}</Badge>}
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                  {isPending && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(u.user_id, "approved")}
                        className="flex-1 h-8 gap-1 gold-gradient text-primary-foreground text-xs"
                      >
                        <Check className="h-3 w-3" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleApprove(u.user_id, "rejected")}
                        className="h-8 gap-1 text-destructive text-xs"
                      >
                        <Ban className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  {!isPending && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingUser(u)}
                      className="flex-1 h-8 gap-1 text-xs"
                    >
                      <UserCog className="h-3 w-3" />
                      Editar rol
                    </Button>
                  )}
                  {u.user_id !== currentUser?.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingUser(u)}
                      className="h-8 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {editingUser && (
          <EditUserModal
            user={editingUser}
            onClose={() => setEditingUser(null)}
            onSave={handleSaveRole}
          />
        )}
        {showInvite && (
          <InviteUserModal
            onClose={() => setShowInvite(false)}
            onInvited={loadUsers}
          />
        )}
        {deletingUser && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={() => !deleteLoading && setDeletingUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass border border-destructive/30 rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-5 border-b border-border/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <h2 className="font-display text-lg font-semibold text-foreground">Eliminar usuario</h2>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-foreground">
                  ¿Seguro que quieres eliminar a <strong>{deletingUser.name}</strong>?
                </p>
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-semibold text-destructive">Esta acción es permanente y eliminará:</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                    <li>La cuenta y acceso del usuario</li>
                    <li>Su perfil y datos personales</li>
                    <li>Sus videos, eventos, comentarios y métricas</li>
                  </ul>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleteLoading ? "Eliminando..." : "Sí, eliminar"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDeletingUser(null)}
                    disabled={deleteLoading}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
