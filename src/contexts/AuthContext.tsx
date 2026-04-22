import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "admin" | "editor" | "diseñador" | "cliente";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  business: string;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  clienteId?: string;
  customAvatar?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AppUser | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<AppUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchUserRole(userId: string): Promise<UserRole> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.role as UserRole) ?? "cliente";
}

async function fetchProfile(userId: string): Promise<{ display_name: string | null; email: string | null; avatar_url: string | null; business: string | null; approval_status: ApprovalStatus | null }> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, email, avatar_url, business, approval_status")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? { display_name: null, email: null, avatar_url: null, business: null, approval_status: null };
}

function buildAppUser(authUser: User, profile: Awaited<ReturnType<typeof fetchProfile>>, role: UserRole): AppUser {
  const name = profile.display_name || authUser.email?.split("@")[0] || "Usuario";
  return {
    id: authUser.id,
    name,
    email: profile.email || authUser.email || "",
    avatar: name.substring(0, 2).toUpperCase(),
    business: profile.business || "",
    role,
    approvalStatus: (profile.approval_status as ApprovalStatus) ?? "pending",
    clienteId: role === "cliente" ? authUser.id : undefined,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserData = useCallback(async (authUser: User) => {
    const [profile, role] = await Promise.all([fetchProfile(authUser.id), fetchUserRole(authUser.id)]);
    setUser(buildAppUser(authUser, profile, role));
  }, []);

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        // Defer data fetch to avoid deadlock with Supabase client
        setTimeout(() => loadUserData(newSession.user), 0);
      } else {
        setUser(null);
      }
      if (event === "INITIAL_SESSION") {
        setIsLoading(false);
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      if (existing?.user) {
        loadUserData(existing.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    } catch (err: any) {
      toast.error(err.message || "Error al iniciar sesión");
      throw err;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw new Error(error.message);
    } catch (err: any) {
      toast.error(err.message || "Error al registrarse");
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err: any) {
      toast.error("Error al cerrar sesión");
    }
    setUser(null);
    setSession(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<AppUser>) => {
    setUser((prev) => prev ? { ...prev, ...updates } : prev);
    if (session?.user) {
      const dbUpdates: { display_name?: string; email?: string; business?: string } = {};
      if (updates.name) dbUpdates.display_name = updates.name;
      if (updates.email) dbUpdates.email = updates.email;
      if (updates.business) dbUpdates.business = updates.business;
      if (Object.keys(dbUpdates).length > 0) {
        try {
          const { error } = await supabase.from("profiles").update(dbUpdates).eq("user_id", session.user.id);
          if (error) throw error;
          toast.success("Perfil actualizado");
        } catch (err: any) {
          toast.error("Error al guardar perfil: " + (err.message || ""));
        }
      }
    }
  }, [session]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!session && !!user,
      isLoading,
      user,
      session,
      login,
      register,
      logout,
      updateProfile,
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
