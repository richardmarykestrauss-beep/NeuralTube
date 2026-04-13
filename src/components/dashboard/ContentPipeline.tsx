import { Play, Pause, CheckCircle2, Loader2, AlertCircle, Film, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { subscribeToVideos, Video } from "@/services/firestoreService";

const mockVideos: Video[] = [
  { title: "10 AI Tools Replacing Developers in 2026", stage: "published", views: "142K", revenue: "$847", time: "2h ago", authorUid: "system" },
  { title: "Why Solar Panels Are FREE Now", stage: "rendering", progress: 78, eta: "12 min", authorUid: "system" },
  { title: "The $0 to $10K/mo Crypto Strategy", stage: "voiceover", progress: 45, eta: "28 min", authorUid: "system" },
  { title: "Doctors HATE This Natural Alternative", stage: "scripting", progress: 15, eta: "1h 5min", authorUid: "system" },
  { title: "Smart Home Setup Under $200", stage: "queued", scheduled: "Tomorrow 8AM", authorUid: "system" },
  { title: "Minimalist Wardrobe: 30 Items Only", stage: "research", progress: 5, eta: "2h", authorUid: "system" },
];

const stageConfig: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  published: { icon: CheckCircle2, color: "text-success", label: "PUBLISHED" },
  rendering: { icon: Film, color: "text-ai-glow", label: "RENDERING" },
  voiceover: { icon: Play, color: "text-cyber", label: "VOICEOVER" },
  scripting: { icon: Loader2, color: "text-info", label: "SCRIPTING" },
  queued: { icon: Pause, color: "text-muted-foreground", label: "QUEUED" },
  research: { icon: Loader2, color: "text-warning", label: "RESEARCH" },
  error: { icon: AlertCircle, color: "text-destructive", label: "ERROR" },
};

export const ContentPipeline = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToVideos((data) => {
      setVideos(data.length > 0 ? data : mockVideos);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Film className="h-4 w-4 text-ai-glow" />
          <h3 className="font-semibold text-sm">CONTENT PIPELINE</h3>
          <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
            {videos.length} items
          </span>
        </div>
        <button className="text-xs font-mono text-primary hover:text-primary/80 transition-colors">
          VIEW ALL →
        </button>
      </div>
      <div className="divide-y divide-border">
        {videos.map((item, i) => {
          const stage = stageConfig[item.stage] || stageConfig.error;
          const Icon = stage.icon;
          return (
            <div key={item.id || i} className="p-3 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Icon className={cn("h-4 w-4 shrink-0", stage.color, item.stage === "scripting" || item.stage === "research" ? "animate-spin" : "")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("text-[10px] font-mono uppercase px-1.5 py-0.5 rounded", `${stage.color} bg-secondary`)}>
                        {stage.label}
                      </span>
                      {item.progress !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <div className="h-1 w-20 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${item.progress}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">{item.progress}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {item.stage === "published" ? (
                    <>
                      <p className="text-xs font-mono text-foreground">{item.views} views</p>
                      <p className="text-xs font-mono text-revenue">{item.revenue}</p>
                    </>
                  ) : (
                    <p className="text-xs font-mono text-muted-foreground">
                      {item.eta ? `ETA: ${item.eta}` : item.scheduled}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
