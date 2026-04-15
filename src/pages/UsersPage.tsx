import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, UserRole, PendingUser } from "@/contexts/AuthContext";
import { clients } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, UserCog } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const roleBadges: Record<string, { label: string; class: string }> = {
  admin: { label: "ADMIN", class: "gold-gradient text-primary-foreground" },
  editor: { label: "EDITOR", class: "bg-status-published/20 text-status-published border-status-published/30" },
  "diseñador": { label: "DISEÑADOR", class: "bg-status-changes/20 text-status-changes border-status-changes/30" },
  cliente: { label: "CLIENTE", class: "bg-secondary text-muted-foreground" },
};

function EditUserModal({ user, onClose, onSave, onDeactivate }: {
  user: PendingUser;
  onClose: () => void;
  onSave: (role: UserRole, clienteId?: string) => void;
  onDeactivate: () => void;
}) {
  const [role, setRole] = useState<UserRole>(user.assignedRole || "cliente");
  const [clienteId, setClienteId] = useState(user.assignedClienteId || "");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} className="glass gold-border gold-glow rounded-2xl w-full max-w-md max-w-[95vw]">
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
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="diseñador">Diseñador</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "cliente" && (
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Cliente asignado</label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="bg-secondary border-border/50 rounded-xl"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent className="glass gold-border">
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button onClick={() => onSave(role, clienteId || undefined)} className="flex-1 gold-gradient text-primary-foreground rounded-xl">
              Guardar cambios
            </Button>
          </div>
          <Button onClick={onDeactivate} variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 rounded-xl">
            Desactivar usuario
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function UsersPage() {
  const { pendingUsers, setPendingUsers, registeredUsers, setRegisteredUsers } = useAuth();
  const [approveModal, setApproveModal] = useState<string | null>(null);
  const [assignRole, setAssignRole] = useState<UserRole>("cliente");
  const [assignCliente, setAssignCliente] = useState("");
  const [editingUser, setEditingUser] = useState<PendingUser | null>(null);
  const [rejectingIds, setRejectingIds] = useState<Set<string>>(new Set());

  const handleApprove = (userId: string) => {
    setPendingUsers((prev) =>
      prev.map((u) => u.id === userId ? { ...u, status: "aprobado" as const, assignedRole: assignRole, assignedClienteId: assignCliente || undefined } : u)
    );
    const user = pendingUsers.find((u) => u.id === userId);
    if (user) {
      setRegisteredUsers((prev) => [...prev, { ...user, status: "aprobado" as const, assignedRole: assignRole, assignedClienteId: assignCliente || undefined }]);
    }
    setApproveModal(null);
  };

  const handleReject = (userId: string) => {
    setRejectingIds((prev) => new Set(prev).add(userId));
    setTimeout(() => {
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      setRejectingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }, 3000);
  };

  const handleEditSave = (role: UserRole, clienteId?: string) => {
    if (!editingUser) return;
    setRegisteredUsers((prev) =>
      prev.map((u) => u.id === editingUser.id ? { ...u, assignedRole: role, assignedClienteId: clienteId } : u)
    );
    setEditingUser(null);
  };

  const handleDeactivate = () => {
    if (!editingUser) return;
    setRegisteredUsers((prev) => prev.filter((u) => u.id !== editingUser.id));
    setEditingUser(null);
  };

  const pending = pendingUsers.filter((u) => u.status === "pendiente" && !rejectingIds.has(u.id));
  const fadingOut = pendingUsers.filter((u) => rejectingIds.has(u.id));
  const active = registeredUsers.filter((u) => u.status === "aprobado");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Gestión de Usuarios</h1>
        <p className="text-sm text-muted-foreground mt-1">Aprueba, asigna roles y administra usuarios</p>
      </motion.div>

      <Tabs defaultValue="pending">
        <TabsList className="bg-secondary border border-border/50">
          <TabsTrigger value="pending" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Pendientes ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Usuarios activos ({active.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <div className="glass gold-border rounded-xl overflow-hidden">
            {pending.length === 0 && fadingOut.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground text-center">No hay usuarios pendientes de aprobación.</p>
            )}
            <AnimatePresence>
              {[...pending, ...fadingOut].map((u) => {
                const isFading = rejectingIds.has(u.id);
                return (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: isFading ? 0 : 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: isFading ? 2.5 : 0.3 }}
                    className="flex items-center gap-4 px-5 py-4 border-b border-border/30 last:border-0"
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground">
                      {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email} · {formatDistanceToNow(new Date(u.date), { addSuffix: true, locale: es })}</p>
                    </div>
                    {isFading ? (
                      <span className="text-xs text-destructive">Rechazado</span>
                    ) : approveModal === u.id ? (
                      <div className="flex items-center gap-2">
                        <Select value={assignRole} onValueChange={(v) => setAssignRole(v as UserRole)}>
                          <SelectTrigger className="w-32 h-8 text-xs bg-secondary border-border/50 rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent className="glass gold-border">
                            <SelectItem value="cliente">Cliente</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="diseñador">Diseñador</SelectItem>
                          </SelectContent>
                        </Select>
                        {assignRole === "cliente" && (
                          <Select value={assignCliente} onValueChange={setAssignCliente}>
                            <SelectTrigger className="w-36 h-8 text-xs bg-secondary border-border/50 rounded-lg"><SelectValue placeholder="Cliente..." /></SelectTrigger>
                            <SelectContent className="glass gold-border">
                              {clients.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Button size="sm" onClick={() => handleApprove(u.id)} className="h-8 bg-status-approved text-foreground"><Check className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setApproveModal(null)} className="h-8"><X className="h-3 w-3" /></Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setApproveModal(u.id)} className="h-8 bg-status-approved/20 text-status-approved hover:bg-status-approved/30">Aprobar</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleReject(u.id)} className="h-8 text-destructive hover:bg-destructive/10">Rechazar</Button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <div className="glass gold-border rounded-xl overflow-hidden">
            {active.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground text-center">No hay usuarios registrados aún.</p>
            )}
            {active.map((u) => {
              const badge = roleBadges[u.assignedRole || "cliente"];
              const client = clients.find((c) => c.id === u.assignedClienteId);
              return (
                <div key={u.id} className="flex items-center gap-4 px-5 py-4 border-b border-border/30 last:border-0">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground">
                    {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  {badge && <Badge className={`text-[9px] ${badge.class}`}>{badge.label}</Badge>}
                  {client && <span className="text-xs text-muted-foreground">{client.nombre}</span>}
                  <button
                    onClick={() => setEditingUser(u)}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title="Editar usuario"
                  >
                    <UserCog className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <AnimatePresence>
        {editingUser && (
          <EditUserModal
            user={editingUser}
            onClose={() => setEditingUser(null)}
            onSave={handleEditSave}
            onDeactivate={handleDeactivate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
