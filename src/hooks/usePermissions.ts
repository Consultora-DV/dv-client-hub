import { useAuth, UserRole } from "@/contexts/AuthContext";

export function usePermissions() {
  const { user } = useAuth();
  const role: UserRole = user?.role ?? "cliente";

  return {
    isAdmin: role === "admin",
    isClient: role === "cliente",
    canUpload: role === "admin" || role === "editor" || role === "diseñador",
    canApprove: role === "cliente" || role === "admin",
    canComment: true,
    canManageUsers: role === "admin",
    canAddVideos: role === "admin" || role === "editor",
    canAddCalendarEvents: role === "admin" || role === "editor" || role === "diseñador",
    role,
  };
}
