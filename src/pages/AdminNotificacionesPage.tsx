import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, RefreshCw, Send, X, ChevronDown, ChevronUp, Inbox, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchPendingDigests, sendDigestToUser, dismissDigestForUser,
  PendingDigestUser,
} from "@/services/notificationDigestService";

const roleColors: Record<string, string> = {
  admin: "gold-gradient text-primary-foreground",
  editor: "bg-status-published/20 text-status-published",
  cliente: "bg-secondary text-muted-foreground",
  diseñador: "bg-status-changes/20 text-status-changes",
};

export default function AdminNotificacionesPage() {
  const [users, setUsers] = useState<PendingDigestUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setUsers(await fetchPendingDigests());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSend = async (u: PendingDigestUser) => {
    if (!confirm(`Enviar resumen de ${u.count} notificación${u.count === 1 ? "" : "es"} por email a ${u.name} (${u.email})?`)) return;
    setSending(u.userId);
    const result = await sendDigestToUser(u.userId);
    setSending(null);
    if (result.ok) {
      toast.success(`Email enviado a ${u.name} (${result.sent} avisos resumidos)`);
      setUsers((prev) => prev.filter((x) => x.userId !== u.userId));
    } else {
      toast.error(result.error || "Error al enviar email");
    }
  };

  const handleDismiss = async (u: PendingDigestUser) => {
    if (!confirm(`Descartar resumen de ${u.name} sin enviar email? Las notificaciones in-app no se borran, solo se sacan de esta bandeja.`)) return;
    const result = await dismissDigestForUser(u.userId);
    if (result.ok) {
      toast.success("Bandeja limpia");
      setUsers((prev) => prev.filter((x) => x.userId !== u.userId));
    }
  };

  const total = users.reduce((s, u) => s + u.count, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" /> Bandeja de envío
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Resúmenes pendientes de enviar por email. Las notificaciones in-app ya llegaron — esto solo manda email cuando vos decidas.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refrescar
        </Button>
      </div>

      {/* Total badge */}
      {!loading && users.length > 0 && (
        <div className="glass gold-border rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm">
            <span className="text-foreground font-semibold">{total}</span>
            <span className="text-muted-foreground"> notificaciones pendientes en </span>
            <span className="text-foreground font-semibold">{users.length}</span>
            <span className="text-muted-foreground"> usuario{users.length === 1 ? "" : "s"}</span>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
          <RefreshCw className="h-5 w-5 animate-spin" /> Cargando…
        </div>
      ) : users.length === 0 ? (
        <div className="glass gold-border rounded-xl p-12 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-status-approved/40 mx-auto" />
          <p className="text-foreground font-medium">Bandeja vacía</p>
          <p className="text-sm text-muted-foreground">
            No hay notificaciones pendientes de enviar. Cada vez que cambies algo (status, pago, asignación) aparecerán aquí agrupadas por usuario.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const isExpanded = expanded === u.userId;
            const isSending = sending === u.userId;
            return (
              <div key={u.userId} className="glass gold-border rounded-xl overflow-hidden">
                {/* Header row */}
                <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">{u.name}</p>
                        <Badge className={`text-[9px] ${roleColors[u.role] || ""}`}>{u.role.toUpperCase()}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{u.count} aviso{u.count === 1 ? "" : "s"}</span>
                    <button onClick={() => setExpanded(isExpanded ? null : u.userId)}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <Button size="sm" variant="ghost" onClick={() => handleDismiss(u)}
                      title="Descartar sin enviar email">
                      <X className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={() => handleSend(u)} disabled={isSending}
                      className="gold-gradient text-primary-foreground gap-1.5">
                      {isSending ? (
                        <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Enviando…</>
                      ) : (
                        <><Send className="h-3.5 w-3.5" /> Enviar email</>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded — list of notifications to be summarized */}
                {isExpanded && (
                  <div className="border-t border-border/30 bg-secondary/10 divide-y divide-border/20">
                    {u.notifications.map((n) => (
                      <div key={n.id} className="px-5 py-3 flex items-start gap-3 text-sm">
                        <Inbox className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(n.date).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Setup hint */}
      <div className="glass border border-border/30 rounded-xl p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">⚙️ Configuración:</strong> el envío requiere que esté configurada
        la edge function <code className="text-primary">send-notification-digest</code> con la API key de Resend.
        Si los envíos fallan, revisa Supabase → Edge Functions → Secrets.
      </div>
    </motion.div>
  );
}
