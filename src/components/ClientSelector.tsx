import { useAppState } from "@/contexts/AppStateContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";

export function ClientSelector() {
  const { clients, selectedClienteId, setSelectedClienteId } = useAppState();
  const { isClient } = usePermissions();

  if (isClient) return null;

  if (clients.length === 0) {
    return (
      <span className="text-sm text-muted-foreground italic hidden md:inline">Sin clientes aún</span>
    );
  }

  const selectedClient = clients.find((c) => c.id === selectedClienteId);

  return (
    <>
      {/* Desktop: full selector */}
      <div className="hidden md:block">
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
      </div>
      {/* Mobile: compact avatar/initial */}
      <div className="md:hidden">
        <Select value={selectedClienteId || "all"} onValueChange={(v) => setSelectedClienteId(v === "all" ? null : v)}>
          <SelectTrigger className="w-auto bg-secondary border-border/50 rounded-xl h-9 px-2.5 text-sm">
            {selectedClient ? (
              <span className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: selectedClient.colorAccent + "33" }}>
                  {selectedClient.avatar}
                </span>
              </span>
            ) : (
              <span className="text-xs">Todos</span>
            )}
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
      </div>
    </>
  );
}
