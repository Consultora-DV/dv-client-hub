import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, FilePlus, LogOut, Video as VideoIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

export function EditorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="h-14 border-b border-border/50 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center">
            <VideoIcon className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-display font-semibold text-foreground">Editor Portal</p>
            <p className="text-[10px] text-muted-foreground -mt-0.5">{user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
      <nav className="border-b border-border/40 px-4 flex gap-1 shrink-0 overflow-x-auto">
        <NavLink
          to="/editor/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`
          }
        >
          <LayoutDashboard className="h-4 w-4" /> Mis entregas
        </NavLink>
        <NavLink
          to="/editor/nueva"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
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
    </div>
  );
}
