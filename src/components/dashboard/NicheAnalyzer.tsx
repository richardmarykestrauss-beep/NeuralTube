import { Target, BarChart3, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { subscribeToNiches, Niche } from "@/services/firestoreService";

const mockNiches: Niche[] = [
  { name: "AI & Technology", channels: 12, avgRPM: "$18.50", saturation: 72, opportunity: 85, topGap: "No one covers AI agent workflows", monthlyRev: "$45K" },
  { name: "Personal Finance", channels: 8, avgRPM: "$22.30", saturation: 65, opportunity: 78, topGap: "Crypto staking tutorials missing", monthlyRev: "$62K" },
  { name: "Health & Wellness", channels: 15, avgRPM: "$14.80", saturation: 80, opportunity: 60, topGap: "Natural alternatives underserved", monthlyRev: "$38K" },
  { name: "Home Improvement", channels: 6, avgRPM: "$12.40", saturation: 45, opportunity: 92, topGap: "Solar DIY content gap", monthlyRev: "$28K" },
];

export const NicheAnalyzer = () => {
  const [niches, setNiches] = useState<Niche[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToNiches((data) => {
      setNiches(data.length > 0 ? data : mockNiches);
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
      <div className="divide-y divide-border">
        {niches.map((niche, i) => (
          <div key={niche.id || i} className="p-3 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium">{niche.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{niche.channels} competitor channels tracked</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono text-revenue">{niche.monthlyRev}/mo</p>
                <p className="text-xs font-mono text-muted-foreground">RPM: {niche.avgRPM}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground">SATURATION</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{niche.saturation}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-destructive/70 rounded-full" style={{ width: `${niche.saturation}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground">OPPORTUNITY</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{niche.opportunity}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full" style={{ width: `${niche.opportunity}%` }} />
                </div>
              </div>
            </div>
            <div className="bg-secondary/50 rounded px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-3 w-3 text-warning shrink-0" />
                <p className="text-xs text-warning font-mono">GAP: {niche.topGap}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
