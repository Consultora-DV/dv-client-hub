import { supabase } from "@/integrations/supabase/client";

export interface BlueprintResult {
  nombre?: string;
  apellido?: string;
  negocio?: string;
  giro?: string;
  ciudad?: string;
  pais?: string;
  objetivos?: string;
  redes?: {
    plataforma: string;
    usuario: string;
    seguidores?: number;
    url?: string;
  }[];
  metricas?: {
    plataforma: string;
    seguidores?: number;
    alcance_mensual?: number;
    publicaciones_mes?: number;
  }[];
  notas?: string;
}

export async function parseBlueprint(text: string): Promise<BlueprintResult> {
  const { data, error } = await supabase.functions.invoke("ai-parse-blueprint", {
    body: { text },
  });

  if (error) {
    throw new Error(error.message || "Error al conectar con el servicio de IA");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as BlueprintResult;
}
