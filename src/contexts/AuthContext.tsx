import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { clients } from "@/data/mockData";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export type UserRole = "admin" | "editor" | "diseñador" | "cliente";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  business: string;
  role: UserRole;
  clienteId?: string;
  customAvatar?: string;
}

export interface PendingUser {
  id: string;
  name: string;
  email: string;
  password: string;
  date: string;
  status: "pendiente" | "aprobado" | "rechazado";
  assignedRole?: UserRole;
  assignedClienteId?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isPending: boolean;
  user: AppUser | null;
  login: (email: string, password: string, role?: UserRole) => void;
  loginAsClient: (clienteId: string) => void;
  register: (name: string, email: string, password: string) => void;
  logout: () => void;
  pendingUsers: PendingUser[];
  setPendingUsers: (u: PendingUser[] | ((prev: PendingUser[]) => PendingUser[])) => void;
  registeredUsers: PendingUser[];
  setRegisteredUsers: (u: PendingUser[] | ((prev: PendingUser[]) => PendingUser[])) => void;
  updateProfile: (updates: Partial<AppUser>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const adminUser: AppUser = {
  id: "admin-dv",
  name: "Consultora DV",
  email: "admin@consultora-dv.mx",
  avatar: "DV",
  business: "Panel de Administración",
  role: "admin",
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [pendingUsers, setPendingUsers] = useLocalStorage<PendingUser[]>("dv_pending_users", []);
  const [registeredUsers, setRegisteredUsers] = useLocalStorage<PendingUser[]>("dv_users_registry", []);

  const login = useCallback((_email: string, _password: string, selectedRole?: UserRole) => {
    const role = selectedRole || "admin";
    if (role === "admin") {
      setUser(adminUser);
    } else if (role === "cliente") {
      const client = clients[0];
      setUser({
        id: client.id,
        name: client.nombre,
        email: client.email,
        avatar: client.avatar,
        business: client.empresa,
        role: "cliente",
        clienteId: client.id,
      });
    } else {
      setUser({
        id: `user-${role}`,
        name: role === "editor" ? "Editor DV" : "Diseñador DV",
        email: `${role}@consultora-dv.mx`,
        avatar: role === "editor" ? "ED" : "DI",
        business: "Consultora DV",
        role,
      });
    }
    setIsPending(false);
    setIsAuthenticated(true);
  }, []);

  const loginAsClient = useCallback((clienteId: string) => {
    const client = clients.find((c) => c.id === clienteId);
    if (!client) return;
    setUser({
      id: client.id,
      name: client.nombre,
      email: client.email,
      avatar: client.avatar,
      business: client.empresa,
      role: "cliente",
      clienteId: client.id,
    });
    setIsPending(false);
    setIsAuthenticated(true);
  }, []);

  const register = useCallback((name: string, email: string, _password: string) => {
    const newPending: PendingUser = {
      id: `pu_${Date.now()}`,
      name,
      email,
      password: "••••••••", // Never store plaintext passwords
      date: new Date().toISOString(),
      status: "pendiente",
    };
    setPendingUsers((prev) => [newPending, ...prev]);
    setIsPending(true);
    setIsAuthenticated(false);
  }, [setPendingUsers]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setIsPending(false);
    setUser(null);
  }, []);

  const updateProfile = useCallback((updates: Partial<AppUser>) => {
    setUser((prev) => prev ? { ...prev, ...updates } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated, isPending, user, login, loginAsClient, register, logout,
      pendingUsers, setPendingUsers, registeredUsers, setRegisteredUsers, updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
