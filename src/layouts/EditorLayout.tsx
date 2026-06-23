import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { LayoutDashboard, FilePlus, LogOut, Video as VideoIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileModal } from "@/components/ProfileModal";
import { NotificationBell } from "@/components/NotificationBell";
import { InstallPrompt } from "@/components/InstallPrompt";

export function EditorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      {/* safe-area top padding so the bar clears the iPhone status bar/notch in PWA mode */}
      <header className="min-h-14 pt-[env(safe-area-inset-top)] border-b border-border/50 px-4 flex items-center justify-between shrink-0 bg-background">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center">
            <VideoIcon className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-display font-semibold text-foreground">Editor Portal</p>
            <p className="text-[10px] text-muted-foreground -mt-0.5">{user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          {/* Profile avatar/button */}
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-2 p-1 pl-2 rounded-lg hover:bg-secondary transition-colors"
            title="Mi perfil"
          >
            <span className="text-xs text-muted-foreground hidden sm:inline">Mi perfil</span>
            <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary flex items-center justify-center">
              {user?.customAvatar ? (
                <img src={user.customAvatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-foreground">{user?.avatar}</span>
              )}
            </div>
          </button>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Nav tabs */}
      <nav className="border-b border-border/40 px-4 flex gap-2 shrink-0 overflow-x-auto bg-secondary/20">
        <NavLink
          to="/editor/dashboard"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              isActive
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`
          }
        >
          <LayoutDashboard className="h-4 w-4" /> Mis entregas
        </NavLink>
        <NavLink
          to="/editor/nueva"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              isActive
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`
          }
        >
          <FilePlus className="h-4 w-4" /> Nueva entrega
        </NavLink>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-6xl w-full mx-auto">
        <Outlet />
      </main>

      <AnimatePresence>
        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      </AnimatePresence>

      <InstallPrompt />
    </div>
  );
}
