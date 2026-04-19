import { DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";
import { useEffect, useState } from "react";
import { subscribeToRevenue, RevenuePoint } from "@/services/firestoreService";

// Placeholder data shown before real revenue data is logged via the pipeline
const mockRevenueData: RevenuePoint[] = [
  { day: "Mon", revenue: 0, views: 0 },
  { day: "Tue", revenue: 0, views: 0 },
  { day: "Wed", revenue: 0, views: 0 },
  { day: "Thu", revenue: 0, views: 0 },
  { day: "Fri", revenue: 0, views: 0 },
  { day: "Sat", revenue: 0, views: 0 },
  { day: "Sun", revenue: 0, views: 0 },
];

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs font-mono text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-mono text-revenue">${payload[0]?.value?.toLocaleString()}</p>
      <p className="text-xs font-mono text-muted-foreground">{payload[1]?.value?.toLocaleString()} views</p>
    </div>
  );
};

export const RevenueChart = () => {
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToRevenue((data) => {
      setRevenueData(data.length > 0 ? data : mockRevenueData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const hasRealData = totalRevenue > 0;
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="h-4 w-4 text-revenue" />
          <h3 className="font-semibold text-sm">REVENUE ENGINE</h3>
          {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          {!loading && !hasRealData && <span className="text-[9px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">AWAITING DATA</span>}
        </div>
        <div className="flex items-center gap-2">
          {hasRealData && <><TrendingUp className="h-3 w-3 text-success" /><span className="text-sm font-mono font-bold text-revenue">${totalRevenue.toLocaleString()}/wk</span></>}
          {!hasRealData && <span className="text-xs font-mono text-muted-foreground">Run pipeline to populate</span>}
        </div>
      </div>
      <div className="p-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={revenueData}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(45 100% 55%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(45 100% 55%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(160 100% 50%)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="hsl(160 100% 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(215 12% 50%)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(215 12% 50%)' }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" stroke="hsl(45 100% 55%)" strokeWidth={2} fill="url(#revenueGrad)" />
            <Area type="monotone" dataKey="views" stroke="hsl(160 100% 50%)" strokeWidth={1} fill="url(#viewsGrad)" yAxisId={0} hide />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
