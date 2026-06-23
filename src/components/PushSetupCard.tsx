import { BellRing, BellOff, Check, Loader2, Smartphone, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface Props {
  /** "card" = full bordered card (settings/profile); "inline" = compact (bell popover). */
  variant?: "card" | "inline";
}

export function PushSetupCard({ variant = "card" }: Props) {
  const { state, supported, busy, enable, disable, test } = usePushNotifications();

  const handleEnable = async () => {
    const res = await enable();
    if (res.ok) toast.success("Notificaciones activadas en este dispositivo 🔔");
    else toast.error(res.error || "No se pudieron activar");
  };

  const handleDisable = async () => {
    await disable();
    toast("Notificaciones desactivadas en este dispositivo");
  };

  const handleTest = async () => {
    const res = await test();
    if (res.ok) toast.success("Enviada — debería aparecer en segundos 📲");
    else toast.error(res.error || "No llegó la prueba");
  };

  if (!supported) {
    if (variant === "inline") return null;
    return (
      <div className="rounded-xl border border-border/50 bg-secondary/30 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-status-pending shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          Este navegador no soporta notificaciones push. En iPhone, primero{" "}
          <strong className="text-foreground">instala la app</strong> (Compartir → “Agregar a inicio”) y ábrela desde el ícono.
        </div>
      </div>
    );
  }

  const subscribed = state === "subscribed";
  const denied = state === "denied";

  if (variant === "inline") {
    if (subscribed) return null; // nothing to nag about once active
    return (
      <button
        onClick={handleEnable}
        disabled={busy || denied}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left bg-primary/10 hover:bg-primary/15 text-foreground transition-colors disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4 text-primary" />}
        {denied ? "Notificaciones bloqueadas en el navegador" : "Activar notificaciones en este dispositivo"}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-secondary/30 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${subscribed ? "bg-status-approved/15" : "bg-primary/10"}`}>
          {subscribed ? <Check className="h-5 w-5 text-status-approved" /> : <Smartphone className="h-5 w-5 text-primary" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Notificaciones en este dispositivo</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {subscribed
              ? "Activas. Te avisaremos aunque tengas la app cerrada."
              : denied
              ? "Bloqueadas. Actívalas en los ajustes del navegador para este sitio."
              : "Recibe un aviso al instante cuando haya una entrega o un cambio."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!subscribed ? (
          <button
            onClick={handleEnable}
            disabled={busy || denied}
            className="flex items-center gap-2 px-4 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-medium disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
            Activar
          </button>
        ) : (
          <>
            <button
              onClick={handleTest}
              disabled={busy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
              Enviar prueba
            </button>
            <button
              onClick={handleDisable}
              disabled={busy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground text-sm font-medium disabled:opacity-60"
            >
              <BellOff className="h-4 w-4" />
              Desactivar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
