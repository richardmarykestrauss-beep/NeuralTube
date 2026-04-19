import { TrendingUp, ExternalLink, Zap, Clock, Play, Loader2, Search } from "lucide-react";
import { StatusIndicator } from "./StatusIndicator";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { subscribeToTrends, Trend } from "@/services/firestoreService";
import { runAutonomousScan } from "@/services/automationService";
import { useAuth } from "@/components/FirebaseProvider";

// No mock data — all trends must come from a real scan
export const TrendScanner = () => {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const unsubscribe = subscribeToTrends((data) => {
      // Only show real data — never fall back to mock
      setTrends(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleScan = async () => {
    if (!user) return;
    setScanning(true);
    // Scan all 4 niches, not just Tech & AI
    const niches = ["Tech & AI", "Personal Finance", "Health & Wellness", "Home Improvement"];
    try {
      for (const niche of niches) {
        await runAutonomousScan(niche, user.uid);
      }
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-4 w-4 text-trending" />
          <h3 className="font-semibold text-sm">TREND SCANNER</h3>
          <StatusIndicator status={scanning ? "scanning" : loading ? "scanning" : "online"} />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-3 py-1 rounded bg-primary/10 text-primary text-[10px] font-mono hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {scanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            AUTONOMOUS SCAN
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <Clock className="h-3 w-3" />
            {loading ? "Connecting..." : scanning ? "Scanning 4 niches..." : "Real-time Feed"}
          </div>
        </div>
      </div>

      {/* Empty state — no fake data */}
      {!loading && trends.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
          <Search className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-mono text-muted-foreground">No trends yet</p>
          <p className="text-xs text-muted-foreground/60">
            Click <span className="text-primary">AUTONOMOUS SCAN</span> to scan all 4 niches and populate this feed.
          </p>
        </div>
      )}

      {/* Real trend list */}
      <div className="divide-y divide-border">
        {trends.map((trend, i) => (
          <div key={trend.id || i} className="p-3 hover:bg-secondary/50 transition-colors group cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-secondary text-xs font-mono text-muted-foreground">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{trend.topic}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-muted-foreground">{trend.niche}</span>
                    {trend.velocity && (
                      <span className="text-xs font-mono text-success">{trend.velocity}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  {trend.revenue && (
                    <p className="text-xs font-mono text-revenue">{trend.revenue}</p>
                  )}
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          trend.status === "hot" ? "bg-trending" : "bg-primary"
                        )}
                        style={{ width: `${trend.score ?? 50}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{trend.score ?? "—"}</span>
                  </div>
                </div>
                <div className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-mono uppercase",
                  trend.status === "hot" ? "bg-trending/20 text-trending" : "bg-primary/20 text-primary"
                )}>
                  {trend.status === "hot" ? <Zap className="h-3 w-3" /> : "↑"}
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
