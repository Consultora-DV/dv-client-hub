import { createContext, useContext, useState, ReactNode } from "react";
import { currentUser } from "@/data/mockData";

export type UserRole = "admin" | "editor" | "diseñador" | "cliente";

export interface AppUser {
  name: string;
  email: string;
  avatar: string;
  business: string;
  role: UserRole;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AppUser | null;
  login: (email: string, password: string, role?: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<UserRole>("cliente");

  const login = (_email: string, _password: string, selectedRole?: UserRole) => {
    if (selectedRole) setRole(selectedRole);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const user: AppUser | null = isAuthenticated
    ? { ...currentUser, role }
    : null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
