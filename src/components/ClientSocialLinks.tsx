import { useAppState } from "@/contexts/AppStateContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Instagram, Globe, MapPin, Share2, Youtube } from "lucide-react";

const PLATFORM_CONFIG: Record<string, { icon: typeof Instagram; color: string; label: string }> = {
  instagram: { icon: Instagram, color: "#E1306C", label: "Instagram" },
  tiktok: { icon: Share2, color: "#00f2ea", label: "TikTok" },
  facebook: { icon: Globe, color: "#1877F2", label: "Facebook" },
  youtube: { icon: Youtube, color: "#FF0000", label: "YouTube" },
  googleMaps: { icon: MapPin, color: "#34A853", label: "Google Maps" },
  website: { icon: Globe, color: "#888", label: "Sitio web" },
};

export function ClientSocialLinks() {
  const { selectedClienteId, clients } = useAppState();

  if (!selectedClienteId) return null;

  const client = clients.find((c) => c.id === selectedClienteId);
  if (!client) return null;

  // Load social networks from localStorage
  let socials: Record<string, { handle?: string; url?: string; followers?: number }> = {};
  try {
    const profile = JSON.parse(localStorage.getItem(`dv_client_profile_${client.id}`) || "null");
    socials = profile?.socialNetworks || {};
  } catch {
    return null;
  }

  const activeSocials = Object.entries(socials).filter(([, v]) => v?.url);

  if (activeSocials.length === 0) return null;

  return (
    <div className="flex items-center gap-0.5">
      {activeSocials.map(([key, data]) => {
        const config = PLATFORM_CONFIG[key];
        if (!config) return null;
        const Icon = config.icon;
        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-md hover:bg-secondary transition-colors"
              >
                <Icon className="h-4 w-4" style={{ color: config.color }} />
              </a>
            </TooltipTrigger>
            <TooltipContent>
              {config.label}{data.handle ? ` · ${data.handle}` : ""}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
