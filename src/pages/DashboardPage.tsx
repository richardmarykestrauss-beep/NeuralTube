import { useEffect, useState } from "react";
import { DollarSign, Eye, Film, TrendingUp, Users, Zap, RefreshCw } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendScanner } from "@/components/dashboard/TrendScanner";
import { ContentPipeline } from "@/components/dashboard/ContentPipeline";
import { NicheAnalyzer } from "@/components/dashboard/NicheAnalyzer";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { AIEngineStatus } from "@/components/dashboard/AIEngineStatus";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { API_BASE_URL } from "@/config/api";
import { subscribeToTrends } from "@/services/firestoreService";
import { subscribeToVideos } from "@/services/firestoreService";

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

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/youtube/channel-info`);
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

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Live trend count from Firestore
  useEffect(() => {
    const unsub = subscribeToTrends((data) => {
      setTrendCount(data.length);
    });
    return () => unsub();
  }, []);

  // Live pipeline video count from Firestore
  useEffect(() => {
    const unsub = subscribeToVideos((data) => {
      setVideoCount(data.length);
    });
    return () => unsub();
  }, []);

  const connected = channelStats?.connected;
  const subscribers = loading ? "..." : connected ? formatNumber(channelStats.subscriberCount) : "—";
  const views = loading ? "..." : connected ? formatNumber(channelStats.viewCount) : "—";
  const videos = loading ? "..." : connected ? channelStats.videoCount.toString() : "—";

  // Trends Found: live count from Firestore (null = still loading)
  const trendsDisplay = trendCount === null ? "..." : trendCount === 0 ? "0" : trendCount.toString();
  const trendsChange = trendCount === null ? "Loading..." : trendCount === 0 ? "Run a scan to populate" : `${trendCount} tracked topics`;

  // Pipeline videos in Firestore
  const pipelineDisplay = videoCount === null ? "..." : videoCount.toString();

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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="Subscribers" value={subscribers} change={connected ? "Live from YouTube" : "Connect YouTube"} changeType={connected ? "positive" : "neutral"} icon={Users} />
        <MetricCard title="Total Views" value={views} change={connected ? "All-time views" : "Connect YouTube"} changeType={connected ? "positive" : "neutral"} icon={Eye} />
        <MetricCard title="Videos Live" value={videos} change={connected ? "Published videos" : "Connect YouTube"} changeType={connected ? "positive" : "neutral"} icon={Film} />
        <MetricCard title="Trends Found" value={trendsDisplay} change={trendsChange} changeType={trendCount && trendCount > 0 ? "positive" : "neutral"} icon={TrendingUp} />
        <MetricCard title="Pipeline" value={pipelineDisplay} change={videoCount === 0 ? "No videos yet" : "Videos in pipeline"} changeType={videoCount && videoCount > 0 ? "positive" : "neutral"} icon={Zap} />
        <MetricCard title="Est. RPM" value={connected ? "$12–22" : "—"} change={connected ? "Based on niche mix" : "Connect YouTube"} changeType={connected ? "positive" : "neutral"} icon={DollarSign} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RevenueChart />
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
