import { useState } from "react";
import { motion } from "framer-motion";
import { followersData, weeklyReach, engagementDistribution, topPost } from "@/data/mockData";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Heart, MessageCircle, Share2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const periods = ["Último mes", "Últimos 3 meses", "Últimos 6 meses"];

export default function MetricsPage() {
  const [period, setPeriod] = useState(2);

  const filteredFollowers = followersData.slice(-[2, 4, 6][period]);
  const filteredReach = weeklyReach.slice(-[4, 6, 8][period]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Métricas</h1>
        <p className="text-sm text-muted-foreground mt-1">Datos actualizados al 14 de abril, 2025</p>
      </motion.div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {periods.map((p, i) => (
          <button
            key={p}
            onClick={() => setPeriod(i)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              period === i ? "gold-gradient text-primary-foreground font-medium" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Followers */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass gold-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Seguidores por plataforma</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={filteredFollowers}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 15%, 18%)" />
              <XAxis dataKey="month" stroke="hsl(240, 10%, 55%)" fontSize={12} />
              <YAxis stroke="hsl(240, 10%, 55%)" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(240, 20%, 12%)", border: "1px solid hsl(240, 15%, 18%)", borderRadius: "8px" }}
                labelStyle={{ color: "hsl(40, 20%, 92%)" }}
              />
              <Legend />
              <Line type="monotone" dataKey="instagram" stroke="hsl(330, 70%, 55%)" strokeWidth={2} dot={{ r: 4 }} name="Instagram" />
              <Line type="monotone" dataKey="tiktok" stroke="hsl(0, 0%, 70%)" strokeWidth={2} dot={{ r: 4 }} name="TikTok" />
              <Line type="monotone" dataKey="youtube" stroke="hsl(0, 80%, 50%)" strokeWidth={2} dot={{ r: 4 }} name="YouTube" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Weekly Reach */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass gold-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Alcance semanal</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={filteredReach}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 15%, 18%)" />
              <XAxis dataKey="week" stroke="hsl(240, 10%, 55%)" fontSize={12} />
              <YAxis stroke="hsl(240, 10%, 55%)" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(240, 20%, 12%)", border: "1px solid hsl(240, 15%, 18%)", borderRadius: "8px" }}
                labelStyle={{ color: "hsl(40, 20%, 92%)" }}
              />
              <Bar dataKey="reach" fill="hsl(42, 52%, 54%)" radius={[4, 4, 0, 0]} name="Alcance" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Engagement Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass gold-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribución de engagement</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={engagementDistribution} dataKey="value" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {engagementDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(240, 20%, 12%)", border: "1px solid hsl(240, 15%, 18%)", borderRadius: "8px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Post */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="glass gold-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top post del mes</h3>
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-foreground">{topPost.title}</p>
              <Badge className="bg-instagram text-xs mt-2">Instagram</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-instagram" />
                <div>
                  <p className="text-lg font-bold text-foreground">{topPost.likes.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Likes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-lg font-bold text-foreground">{topPost.comments.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Comentarios</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-status-approved" />
                <div>
                  <p className="text-lg font-bold text-foreground">{topPost.shares.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Compartidos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-status-published" />
                <div>
                  <p className="text-lg font-bold text-foreground">{topPost.reach.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Alcance</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
