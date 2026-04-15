import { useAppState } from "@/contexts/AppStateContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";

export function ClientSelector() {
  const { clients, selectedClienteId, setSelectedClienteId } = useAppState();
  const { isClient } = usePermissions();

  if (isClient) return null;

  if (clients.length === 0) {
    return (
      <span className="text-sm text-muted-foreground italic">Sin clientes aún</span>
    );
  }

  return (
    <Select value={selectedClienteId || "all"} onValueChange={(v) => setSelectedClienteId(v === "all" ? null : v)}>
      <SelectTrigger className="w-[220px] bg-secondary border-border/50 rounded-xl h-9 text-sm">
        <SelectValue placeholder="Todos los clientes" />
      </SelectTrigger>
      <SelectContent className="glass gold-border">
        <SelectItem value="all">Todos los clientes</SelectItem>
        {clients.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.colorAccent }} />
              {c.nombre}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
