import { Video, CalendarEvent } from "@/data/mockData";
import { ApifyInstagramPost } from "./apifyService";

export function mapPostsToAppData(
  posts: ApifyInstagramPost[],
  clienteId: string,
  _clientName: string
) {
  const videos: Video[] = [];
  const events: CalendarEvent[] = [];

  for (const post of posts) {
    // CalendarEvent for ALL posts
    events.push({
      id: `ig_event_${post.shortCode}`,
      date: post.timestamp.split("T")[0],
      title: post.caption?.split("\n")[0]?.slice(0, 50) || `Post de ${post.ownerUsername}`,
      platform: ["instagram"],
      contentType: post.type === "Video" ? "reel" : post.type === "Sidecar" ? "carrusel" : "post",
      clienteId,
      time: post.timestamp.split("T")[1]?.slice(0, 5) || "00:00",
      videoId: post.isVideo ? `ig_${post.shortCode}` : undefined,
    });

    // Video only for video/reel posts
    if (post.isVideo || post.type === "Video") {
      videos.push({
        id: `ig_${post.shortCode}`,
        clienteId,
        title: post.caption?.split("\n")[0]?.slice(0, 60) || `Reel de ${post.ownerUsername}`,
        platform: ["instagram"],
        status: "published",
        thumbnail: post.displayUrl,
        deliveryDate: post.timestamp,
        embedUrl: post.url,
        driveLink: "#",
        comments: [],
        statusHistory: [
          {
            status: "Publicado",
            date: post.timestamp.split("T")[0],
            by: "Importado desde Instagram",
          },
        ],
        // Instagram metadata
        igCaption: post.caption || "",
        igLikes: post.likesCount,
        igComments: post.commentsCount,
        igViews: post.videoViewCount || 0,
        igHashtags: post.hashtags,
        igShortCode: post.shortCode,
      } as Video & Record<string, any>);
    }
  }

  return { videos, events };
}
