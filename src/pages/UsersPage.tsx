import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth, UserRole } from "@/contexts/AuthContext";
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

export default function UsersPage() {
  const { pendingUsers, setPendingUsers, registeredUsers, setRegisteredUsers } = useAuth();
  const [approveModal, setApproveModal] = useState<string | null>(null);
  const [assignRole, setAssignRole] = useState<UserRole>("cliente");
  const [assignCliente, setAssignCliente] = useState("");

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
    setPendingUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: "rechazado" as const } : u));
  };

  const pending = pendingUsers.filter((u) => u.status === "pendiente");
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
            {pending.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground text-center">No hay usuarios pendientes de aprobación.</p>
            )}
            {pending.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4 border-b border-border/30 last:border-0">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground">
                  {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email} · {formatDistanceToNow(new Date(u.date), { addSuffix: true, locale: es })}</p>
                </div>
                {approveModal === u.id ? (
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
              </div>
            ))}
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
                  <UserCog className="h-4 w-4 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
