import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { followersData, weeklyReach, engagementDistribution, topPost, MetricEntry, WeeklyReach } from "@/data/mockData";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Heart, MessageCircle, Share2, Eye, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const periods = ["Último mes", "Últimos 3 meses", "Últimos 6 meses"];

export default function MetricsPage() {
  const [period, setPeriod] = useState(2);
  const { canUpload } = usePermissions();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadedData, setUploadedData] = useLocalStorage<{
    followers?: MetricEntry[];
    reach?: WeeklyReach[];
    fileName?: string;
    date?: string;
  } | null>("dv_metrics_data", null);

  const activeFollowers = uploadedData?.followers || followersData;
  const activeReach = uploadedData?.reach || weeklyReach;

  const filteredFollowers = activeFollowers.slice(-[2, 4, 6][period]);
  const filteredReach = activeReach.slice(-[4, 6, 8][period]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Máximo 5MB"); return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const lines = text.trim().split("\n");
      const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());

      if (headers.includes("mes") && headers.includes("instagram")) {
        const followers: MetricEntry[] = lines.slice(1).map((line) => {
          const vals = line.split(",").map((v) => v.trim());
          return {
            month: vals[headers.indexOf("mes")],
            instagram: Number(vals[headers.indexOf("instagram")]) || 0,
            tiktok: Number(vals[headers.indexOf("tiktok")]) || 0,
            youtube: Number(vals[headers.indexOf("youtube")]) || 0,
            facebook: Number(vals[headers.indexOf("facebook")]) || 0,
          };
        });
        setUploadedData({ followers, fileName: file.name, date: new Date().toISOString() });
      } else if (headers.includes("semana") && headers.includes("alcance")) {
        const reach: WeeklyReach[] = lines.slice(1).map((line) => {
          const vals = line.split(",").map((v) => v.trim());
          return {
            week: vals[headers.indexOf("semana")],
            reach: Number(vals[headers.indexOf("alcance")]) || 0,
          };
        });
        setUploadedData({ reach, fileName: file.name, date: new Date().toISOString() });
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeUpload = () => setUploadedData(null);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Métricas</h1>
        <p className="text-sm text-muted-foreground mt-1">Datos actualizados al 14 de abril, 2026</p>
      </motion.div>

      {canUpload && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass gold-border rounded-xl p-5">
          {uploadedData?.fileName ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{uploadedData.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    Actualizado: {uploadedData.date ? new Date(uploadedData.date).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : ""}
                  </p>
                </div>
              </div>
              <button onClick={removeUpload} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-4 cursor-pointer">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Sube tu reporte de métricas</p>
                <p className="text-xs text-muted-foreground">CSV con columnas: mes, instagram, tiktok, youtube — o: semana, alcance</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            </label>
          )}
        </motion.div>
      )}

      <div className="flex gap-2">
        {periods.map((p, i) => (
          <button key={p} onClick={() => setPeriod(i)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${period === i ? "gold-gradient text-primary-foreground font-medium" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass gold-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Seguidores por plataforma</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={filteredFollowers}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 15%, 18%)" />
              <XAxis dataKey="month" stroke="hsl(240, 10%, 55%)" fontSize={12} />
              <YAxis stroke="hsl(240, 10%, 55%)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(240, 20%, 12%)", border: "1px solid hsl(240, 15%, 18%)", borderRadius: "8px" }} labelStyle={{ color: "hsl(40, 20%, 92%)" }} />
              <Legend />
              <Line type="monotone" dataKey="instagram" stroke="hsl(330, 70%, 55%)" strokeWidth={2} dot={{ r: 4 }} name="Instagram" />
              <Line type="monotone" dataKey="tiktok" stroke="hsl(0, 0%, 70%)" strokeWidth={2} dot={{ r: 4 }} name="TikTok" />
              <Line type="monotone" dataKey="youtube" stroke="hsl(0, 80%, 50%)" strokeWidth={2} dot={{ r: 4 }} name="YouTube" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass gold-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Alcance semanal</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={filteredReach}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 15%, 18%)" />
              <XAxis dataKey="week" stroke="hsl(240, 10%, 55%)" fontSize={12} />
              <YAxis stroke="hsl(240, 10%, 55%)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(240, 20%, 12%)", border: "1px solid hsl(240, 15%, 18%)", borderRadius: "8px" }} labelStyle={{ color: "hsl(40, 20%, 92%)" }} />
              <Bar dataKey="reach" fill="hsl(42, 52%, 54%)" radius={[4, 4, 0, 0]} name="Alcance" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass gold-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribución de engagement</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={engagementDistribution} dataKey="value" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {engagementDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(240, 20%, 12%)", border: "1px solid hsl(240, 15%, 18%)", borderRadius: "8px" }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass gold-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top post del mes</h3>
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-foreground">{topPost.title}</p>
              <Badge className="bg-instagram text-xs mt-2">Instagram</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Heart, value: topPost.likes, label: "Likes", color: "text-instagram" },
                { icon: MessageCircle, value: topPost.comments, label: "Comentarios", color: "text-primary" },
                { icon: Share2, value: topPost.shares, label: "Compartidos", color: "text-status-approved" },
                { icon: Eye, value: topPost.reach, label: "Alcance", color: "text-status-published" },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-2">
                  <m.icon className={`h-4 w-4 ${m.color}`} />
                  <div>
                    <p className="text-lg font-bold text-foreground">{m.value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
