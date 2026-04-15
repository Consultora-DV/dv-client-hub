import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Video, FileText, Calendar, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAppState } from "@/contexts/AppStateContext";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { videos, scripts, documents, calendarEvents } = useAppState();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50 text-muted-foreground text-xs hover:bg-secondary transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border/50 bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar videos, documentos, eventos..." />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          {videos.length > 0 && (
            <CommandGroup heading="Videos">
              {videos.slice(0, 5).map((v) => (
                <CommandItem key={v.id} onSelect={() => go("/videos")}>
                  <Video className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{v.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {scripts.length > 0 && (
            <CommandGroup heading="Guiones">
              {scripts.slice(0, 5).map((s) => (
                <CommandItem key={s.id} onSelect={() => go("/documentos")}>
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{s.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {documents.length > 0 && (
            <CommandGroup heading="Documentos">
              {documents.slice(0, 5).map((d) => (
                <CommandItem key={d.id} onSelect={() => go("/documentos")}>
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{d.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {calendarEvents.length > 0 && (
            <CommandGroup heading="Calendario">
              {calendarEvents.slice(0, 5).map((e) => (
                <CommandItem key={e.id} onSelect={() => go("/calendario")}>
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{e.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{e.date}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
