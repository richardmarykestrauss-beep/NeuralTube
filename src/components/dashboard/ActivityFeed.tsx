import { Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { subscribeToLogs, AILog } from "@/services/firestoreService";
import { Timestamp } from "firebase/firestore";

const mockActivities: AILog[] = [
  { event: "Video published: '10 AI Tools Replacing Developers'", type: "success", timestamp: Timestamp.now() },
  { event: "Trend detected: Solar Panel DIY surging +340%", type: "info", timestamp: Timestamp.now() },
  { event: "Script generated for 'Crypto Staking Strategy'", type: "info", timestamp: Timestamp.now() },
  { event: "Competitor gap found: Home Automation niche underserved", type: "info", timestamp: Timestamp.now() },
  { event: "Revenue milestone: $2,500/day crossed", type: "success", timestamp: Timestamp.now() },
  { event: "Self-learning: Updated thumbnail strategy — +12% CTR", type: "info", timestamp: Timestamp.now() },
  { event: "Voiceover completed for 'Natural Alternatives' video", type: "success", timestamp: Timestamp.now() },
  { event: "Niche scan complete: 4 new opportunities identified", type: "info", timestamp: Timestamp.now() },
];

const typeColors: Record<string, string> = {
  success: "text-success",
  info: "text-cyber",
  warning: "text-warning",
  error: "text-destructive",
};

export const ActivityFeed = () => {
  const [logs, setLogs] = useState<AILog[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToLogs((data) => {
      setLogs(data.length > 0 ? data : mockActivities);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <Zap className="h-4 w-4 text-warning" />
        <h3 className="font-semibold text-sm">LIVE ACTIVITY</h3>
        <div className="h-1.5 w-1.5 bg-success rounded-full animate-pulse" />
      </div>
      <div className="max-h-64 overflow-y-auto">
        {logs.map((a, i) => (
          <div key={a.id || i} className="px-3 py-2 hover:bg-secondary/30 transition-colors flex items-start gap-2 border-b border-border/50 last:border-0">
            <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-12 pt-0.5">
              {a.timestamp?.toDate ? a.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </span>
            <div className={cn("h-1.5 w-1.5 rounded-full shrink-0 mt-1.5", typeColors[a.type]?.replace("text-", "bg-"))} />
            <p className={cn("text-xs", typeColors[a.type])}>{a.event}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
