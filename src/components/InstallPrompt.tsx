import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { isStandalone } from "@/lib/pwa";

const DISMISS_KEY = "dv_install_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Floating "install this app" prompt.
 *  - Android / desktop Chrome: uses the native beforeinstallprompt.
 *  - iOS Safari: shows the manual "Compartir → Agregar a inicio" hint.
 * Hidden once installed (standalone) or dismissed.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS never fires beforeinstallprompt — show the manual hint instead.
    if (isIos()) {
      const t = setTimeout(() => {
        setIosHint(true);
        setShow(true);
      }, 3000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-[4.5rem] md:bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-sm z-50 glass gold-border rounded-xl p-3 shadow-xl flex items-start gap-3 animate-in slide-in-from-bottom-4">
      <div className="w-9 h-9 rounded-lg gold-gradient flex items-center justify-center shrink-0">
        <Download className="h-4 w-4 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Instala el panel en tu celular</p>
        {iosHint ? (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
            Toca <Share className="h-3.5 w-3.5 inline" /> <strong className="text-foreground">Compartir</strong> y luego{" "}
            <strong className="text-foreground">“Agregar a inicio”</strong>.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acceso directo como app nativa + notificaciones aunque esté cerrada.
            </p>
            <button
              onClick={install}
              className="mt-2 text-xs px-3 py-1.5 rounded-lg gold-gradient text-primary-foreground font-medium"
            >
              Instalar app
            </button>
          </>
        )}
      </div>
      <button onClick={dismiss} className="text-muted-foreground hover:text-foreground shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
