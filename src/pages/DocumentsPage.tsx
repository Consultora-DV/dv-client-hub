import { motion } from "framer-motion";
import { scripts, documents } from "@/data/mockData";
import { ExternalLink, FileText, File, Table, Presentation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { differenceInDays } from "date-fns";

const isRecent = (dateStr: string) => differenceInDays(new Date(), new Date(dateStr)) < 3;

const statusConfig: Record<string, { label: string; class: string }> = {
  new: { label: "Nuevo", class: "bg-primary/20 text-primary border-primary/30" },
  reviewed: { label: "Revisado", class: "bg-status-changes/20 text-status-changes border-status-changes/30" },
  approved: { label: "Aprobado", class: "bg-status-approved/20 text-status-approved border-status-approved/30" },
};

const typeIcons: Record<string, typeof FileText> = {
  pdf: File,
  doc: FileText,
  sheet: Table,
  slide: Presentation,
};

const typeLabels: Record<string, string> = {
  pdf: "PDF",
  doc: "Documento",
  sheet: "Hoja de cálculo",
  slide: "Presentación",
};

export default function DocumentsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Guiones y Documentos</h1>
        <p className="text-sm text-muted-foreground mt-1">Tu expediente completo</p>
      </motion.div>

      <Tabs defaultValue="scripts">
        <TabsList className="bg-secondary border border-border/50">
          <TabsTrigger value="scripts" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Guiones
          </TabsTrigger>
          <TabsTrigger value="docs" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scripts" className="mt-4">
          <div className="glass gold-border rounded-xl overflow-hidden">
            {scripts.map((s, i) => {
              const status = statusConfig[s.status];
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 px-5 py-4 border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors"
                >
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                      {(s.isNew || isRecent(s.date)) && (
                        <Badge className="gold-gradient text-primary-foreground text-[10px] font-semibold border-0">Nuevo</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(s.date).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <Badge variant="outline" className={`border text-xs shrink-0 ${status.class}`}>
                    {status.label}
                  </Badge>
                  <a
                    href={s.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="docs" className="mt-4">
          <div className="glass gold-border rounded-xl overflow-hidden">
            {documents.map((d, i) => {
              const Icon = typeIcons[d.type] || File;
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 px-5 py-4 border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors"
                >
                  <Icon className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                      {(d.isNew || isRecent(d.date)) && (
                        <Badge className="gold-gradient text-primary-foreground text-[10px] font-semibold border-0">Nuevo</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(d.date).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <Badge variant="outline" className="border border-border text-xs text-muted-foreground shrink-0">
                    {typeLabels[d.type]}
                  </Badge>
                  <a
                    href={d.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
