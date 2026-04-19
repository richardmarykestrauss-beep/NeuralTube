import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { subscribeToLogs, AILog } from "@/services/firestoreService";

const typeColors: Record<string, string> = {
  success: "text-success",
  info: "text-cyber",
  warning: "text-warning",
  error: "text-destructive",
};

export const ActivityFeed = () => {
  const [logs, setLogs] = useState<AILog[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToLogs((data) => {
      setLogs(data);
      setReady(true);
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
        {!ready && (
          <div className="px-4 py-6 text-center text-xs font-mono text-muted-foreground">Loading activity...</div>
        )}
        {ready && logs.length === 0 && (
          <div className="px-4 py-8 text-center">
            <Zap className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs font-mono text-muted-foreground">No activity yet</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Start the AI Engine to see live logs here</p>
          </div>
        )}
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
