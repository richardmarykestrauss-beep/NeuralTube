import { useEffect, useState } from "react";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DollarSign, TrendingUp, Eye, Film, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { API_BASE_URL } from "@/config/api";

interface AnalyticsData {
  connected: boolean;
  subscriberCount: number;
  videoCount: number;
  totalViews: number;
  totalRevenue: number;
  avgRPM: number;
  dailyData: Array<{ day: string; revenue: number; views: number; rpm: number }>;
  period: { startDate: string; endDate: string };
}

const RevenuePage = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/youtube/analytics`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to fetch analytics");
      setAnalytics(data);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">REVENUE DASHBOARD</h1>
          <p className="text-muted-foreground text-sm">
            Live YouTube Analytics — last 28 days
            {analytics?.period && (
              <span className="font-mono text-xs ml-2 text-muted-foreground/60">
                ({analytics.period.startDate} → {analytics.period.endDate})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading..." : `Refreshed ${lastRefresh.toLocaleTimeString()}`}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Analytics unavailable</p>
            <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {loading && !analytics && (
        <div className="flex items-center gap-3 p-8 justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-mono">Fetching YouTube Analytics...</span>
        </div>
      )}

      {analytics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Revenue (28d)"
              value={analytics.totalRevenue > 0 ? `$${analytics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}
              change={analytics.totalRevenue > 0 ? "Live from YouTube Analytics" : "Monetization pending"}
              changeType={analytics.totalRevenue > 0 ? "positive" : "neutral"}
              icon={DollarSign}
            />
            <MetricCard
              title="Avg. RPM (28d)"
              value={analytics.avgRPM > 0 ? `$${analytics.avgRPM.toFixed(2)}` : "—"}
              change={analytics.avgRPM > 0 ? "Per 1,000 views" : "No monetized views yet"}
              changeType={analytics.avgRPM > 0 ? "positive" : "neutral"}
              icon={TrendingUp}
            />
            <MetricCard
              title="Total Views"
              value={fmt(analytics.totalViews)}
              change={`${fmt(analytics.subscriberCount)} subscribers`}
              changeType="positive"
              icon={Eye}
            />
            <MetricCard
              title="Videos Published"
              value={analytics.videoCount.toString()}
              change="On NeuralTube channel"
              changeType="positive"
              icon={Film}
            />
          </div>
          <RevenueChart analyticsData={analytics.dailyData} />
        </>
      )}
    </div>
  );
};

export default RevenuePage;
