import { useEffect, useState } from "react";
import { DollarSign, Eye, Film, TrendingUp, Users, Zap, RefreshCw, Trophy, Lightbulb, BarChart2 } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendScanner } from "@/components/dashboard/TrendScanner";
import { ContentPipeline } from "@/components/dashboard/ContentPipeline";
import { NicheAnalyzer } from "@/components/dashboard/NicheAnalyzer";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { AIEngineStatus } from "@/components/dashboard/AIEngineStatus";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { API_BASE_URL } from "@/config/api";
import { subscribeToTrends, subscribeToVideos } from "@/services/firestoreService";
import { auth } from "@/firebase";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

const DashboardPage = () => {
  const [channelStats, setChannelStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [trendCount, setTrendCount] = useState<number | null>(null);
  const [videoCount, setVideoCount] = useState<number | null>(null);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loadingPerformers, setLoadingPerformers] = useState(false);

  const getAuthHeader = async () => {
    const user = auth.currentUser;
    if (!user) return {};
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/youtube/channel-info`, { headers });
      if (res.ok) {
        const data = await res.json();
        setChannelStats(data);
        setLastRefresh(new Date());
      }
    } catch (e) {
      console.warn("Could not fetch YouTube stats:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopPerformers = async () => {
    setLoadingPerformers(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/youtube/top-performers`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTopPerformers(data.topPerformers || []);
        setInsights(data.insights || []);
      }
    } catch (e) {
      console.warn("Could not fetch top performers:", e);
    } finally {
      setLoadingPerformers(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchTopPerformers();
  }, []);

  useEffect(() => {
    const unsub = subscribeToTrends((data) => setTrendCount(data.length));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeToVideos((data) => setVideoCount(data.length));
    return () => unsub();
  }, []);

  const connected = channelStats?.connected;
  const subscribers = loading ? "..." : connected ? formatNumber(channelStats.subscriberCount) : "—";
  const views = loading ? "..." : connected ? formatNumber(channelStats.viewCount) : "—";
  const videos = loading ? "..." : connected ? channelStats.videoCount.toString() : "—";
  const trendsDisplay = trendCount === null ? "..." : trendCount === 0 ? "0" : trendCount.toString();
  const trendsChange = trendCount === null ? "Loading..." : trendCount === 0 ? "Run a scan to populate" : `${trendCount} tracked topics`;
  const pipelineDisplay = videoCount === null ? "..." : videoCount.toString();

  const confidenceColor = (c: string) =>
    c === "high" ? "text-green-400" : c === "medium" ? "text-yellow-400" : "text-muted-foreground";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Loading..."}
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="Subscribers" value={subscribers} change={connected ? "Live from YouTube" : "Connect YouTube"} changeType={connected ? "positive" : "neutral"} icon={Users} />
        <MetricCard title="Total Views" value={views} change={connected ? "All-time views" : "Connect YouTube"} changeType={connected ? "positive" : "neutral"} icon={Eye} />
        <MetricCard title="Videos Live" value={videos} change={connected ? "Published videos" : "Connect YouTube"} changeType={connected ? "positive" : "neutral"} icon={Film} />
        <MetricCard title="Trends Found" value={trendsDisplay} change={trendsChange} changeType={trendCount && trendCount > 0 ? "positive" : "neutral"} icon={TrendingUp} />
        <MetricCard title="Pipeline" value={pipelineDisplay} change={videoCount === 0 ? "No videos yet" : "Videos in pipeline"} changeType={videoCount && videoCount > 0 ? "positive" : "neutral"} icon={Zap} />
        <MetricCard title="Est. RPM" value={connected ? "$12–22" : "—"} change={connected ? "Based on niche mix" : "Connect YouTube"} changeType={connected ? "positive" : "neutral"} icon={DollarSign} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RevenueChart />

          {/* What's Working Section */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest">What's Working</p>
              </div>
              <button
                onClick={fetchTopPerformers}
                disabled={loadingPerformers}
                className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`h-3 w-3 ${loadingPerformers ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {topPerformers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 text-muted-foreground gap-2">
                <BarChart2 className="h-7 w-7" />
                <p className="text-sm font-mono">No published videos yet</p>
                <p className="text-xs text-center">Top performers and AI insights will appear here once your first video is live</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topPerformers.map((v: any, i: number) => (
                  <div key={v.videoId} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors">
                    <span className="text-xs font-mono font-bold text-muted-foreground w-4">#{i + 1}</span>
                    {v.thumbnail && <img src={v.thumbnail} alt="" className="w-14 h-9 object-cover rounded" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono truncate">{v.title}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{formatNumber(v.views)} views · {v.likes} likes</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {insights.length > 0 && (
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-3.5 w-3.5 text-yellow-400" />
                  <p className="text-[10px] font-mono uppercase text-muted-foreground">AI Content Insights</p>
                </div>
                {insights.map((ins: any, i: number) => (
                  <div key={i} className="bg-secondary/20 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-mono font-bold">{ins.pattern}</p>
                      <span className={`text-[10px] font-mono uppercase ${confidenceColor(ins.confidence)}`}>{ins.confidence}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{ins.recommendation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TrendScanner />
            <ContentPipeline />
          </div>
        </div>
        <div className="space-y-6">
          <AIEngineStatus />
          <NicheAnalyzer />
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
