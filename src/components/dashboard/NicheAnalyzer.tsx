import { Target, BarChart3, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { subscribeToNiches, Niche } from "@/services/firestoreService";

// No mock data — niches are populated by the autonomous scan pipeline
export const NicheAnalyzer = () => {
  const [niches, setNiches] = useState<Niche[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToNiches((data) => {
      // Only show real Firestore data
      setNiches(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-4 w-4 text-cyber" />
          <h3 className="font-semibold text-sm">NICHE ANALYZER</h3>
        </div>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

      {/* Empty state — no fake data */}
      {!loading && niches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-4">
          <Search className="h-7 w-7 text-muted-foreground/40" />
          <p className="text-sm font-mono text-muted-foreground">No niche data yet</p>
          <p className="text-xs text-muted-foreground/60">
            Run the <span className="text-primary">Autonomous Scan</span> to populate niche intelligence.
          </p>
        </div>
      )}

      <div className="divide-y divide-border">
        {niches.map((niche, i) => (
          <div key={niche.id || i} className="p-3 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium">{niche.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {niche.channels != null ? `${niche.channels} competitor channels tracked` : "Tracked niche"}
                </p>
              </div>
              <div className="text-right">
                {niche.monthlyRev && (
                  <p className="text-sm font-mono text-revenue">{niche.monthlyRev}/mo</p>
                )}
                {niche.avgRPM && (
                  <p className="text-xs font-mono text-muted-foreground">RPM: {niche.avgRPM}</p>
                )}
              </div>
            </div>
            {(niche.saturation != null || niche.opportunity != null) && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {niche.saturation != null && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground">SATURATION</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{niche.saturation}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-destructive/70 rounded-full" style={{ width: `${niche.saturation}%` }} />
                    </div>
                  </div>
                )}
                {niche.opportunity != null && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground">OPPORTUNITY</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{niche.opportunity}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-success rounded-full" style={{ width: `${niche.opportunity}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}
            {niche.topGap && (
              <div className="bg-secondary/50 rounded px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="h-3 w-3 text-warning shrink-0" />
                  <p className="text-xs text-warning font-mono">GAP: {niche.topGap}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
