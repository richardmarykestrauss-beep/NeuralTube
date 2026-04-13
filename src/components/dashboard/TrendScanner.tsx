import { TrendingUp, ExternalLink, Zap, Clock, Play, Loader2 } from "lucide-react";
import { StatusIndicator } from "./StatusIndicator";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { subscribeToTrends, Trend } from "@/services/firestoreService";
import { runAutonomousScan } from "@/services/automationService";
import { useAuth } from "@/components/FirebaseProvider";

const mockTrends: Trend[] = [
  { topic: "AI Agents Building Apps", score: 98, velocity: "+340%", niche: "Tech", revenue: "$4.2K/day", status: "hot" },
  { topic: "Solar Panel DIY 2026", score: 94, velocity: "+180%", niche: "Home", revenue: "$2.8K/day", status: "hot" },
  { topic: "Ozempic Alternatives Natural", score: 91, velocity: "+220%", niche: "Health", revenue: "$5.1K/day", status: "hot" },
  { topic: "Passive Income Crypto Staking", score: 87, velocity: "+150%", niche: "Finance", revenue: "$3.9K/day", status: "rising" },
  { topic: "Home Automation 2026 Guide", score: 85, velocity: "+120%", niche: "Tech", revenue: "$2.1K/day", status: "rising" },
  { topic: "Minimalist Wardrobe Men", score: 82, velocity: "+95%", niche: "Lifestyle", revenue: "$1.8K/day", status: "rising" },
];

export const TrendScanner = () => {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const unsubscribe = subscribeToTrends((data) => {
      setTrends(data.length > 0 ? data : mockTrends);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleScan = async () => {
    if (!user) return;
    setScanning(true);
    await runAutonomousScan("Tech & AI", user.uid);
    setScanning(false);
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
            {loading ? "Scanning..." : "Real-time Feed"}
          </div>
        </div>
      </div>
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
                    <span className="text-xs font-mono text-success">{trend.velocity}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-mono text-revenue">{trend.revenue}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          trend.status === "hot" ? "bg-trending" : "bg-primary"
                        )}
                        style={{ width: `${trend.score}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{trend.score}</span>
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
