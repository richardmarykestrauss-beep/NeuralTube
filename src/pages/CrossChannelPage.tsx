import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/config/api";
import { auth } from "@/firebase";
import { cn } from "@/lib/utils";
import {
  Network, Users, Eye, Film, TrendingUp, RefreshCw, Loader2,
  Lightbulb, Youtube, AlertTriangle, BarChart3, Trophy, Zap
} from "lucide-react";

interface ChannelStat {
  channelId: string;
  channelTitle: string;
  channelThumbnail: string | null;
  niche: string;
  error?: string;
  stats?: { subscribers: number; totalViews: number; videoCount: number };
  avgViews?: number;
  last30d?: { views: number; watchMinutes: number; subscribersGained: number; likes: number };
  topVideos?: { title: string; videoId: string; views: number; likes: number; thumbnail: string; publishedAt: string }[];
}

interface Portfolio {
  totalChannels: number;
  connectedChannels: number;
  totalSubscribers: number;
  totalViews: number;
  totalVideos: number;
  views30d: number;
  subscribersGained30d: number;
  topChannel: string | null;
}

interface Insight {
  pattern: string;
  finding: string;
  action: string;
  applyTo: string;
  impact: "high" | "medium" | "low";
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

const impactColor = {
  high: "text-green-400 bg-green-400/10 border-green-400/20",
  medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  low: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

export default function CrossChannelPage() {
  const [channels, setChannels] = useState<ChannelStat[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not signed in");
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/analytics/cross-channel`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch cross-channel data");
      const data = await res.json();
      setChannels(data.channels || []);
      setPortfolio(data.portfolio || null);
      setInsights(data.insights || []);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const connected = channels.filter(c => !c.error && c.stats);
  const errored = channels.filter(c => c.error);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            CROSS-CHANNEL INTELLIGENCE
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            Portfolio-wide analytics and AI insights across all channels
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          {lastRefresh
            ? `Updated ${lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : "Refresh"}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-mono">Fetching analytics across all channels…</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 text-destructive text-sm font-mono bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && channels.length === 0 && (
        <div className="border border-dashed border-border rounded-lg p-12 text-center space-y-2">
          <Network className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm font-mono text-muted-foreground">No channels connected</p>
          <p className="text-xs text-muted-foreground">Add channels on the My Channels page to see portfolio analytics.</p>
        </div>
      )}

      {!loading && portfolio && (
        <>
          {/* Portfolio overview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Channels", value: portfolio.totalChannels.toString(), icon: Network },
              { label: "Total Subs", value: fmt(portfolio.totalSubscribers), icon: Users },
              { label: "All-time Views", value: fmt(portfolio.totalViews), icon: Eye },
              { label: "Videos", value: portfolio.totalVideos.toString(), icon: Film },
              { label: "Views (30d)", value: fmt(portfolio.views30d), icon: TrendingUp },
              { label: "New Subs (30d)", value: fmt(portfolio.subscribersGained30d), icon: Zap },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-card border border-border rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  <p className="text-[9px] font-mono uppercase">{label}</p>
                </div>
                <p className="text-lg font-mono font-bold">{value}</p>
              </div>
            ))}
          </div>

          {/* Channel cards */}
          {connected.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest">Channel Breakdown</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {connected.map(ch => {
                  const isTop = ch.channelTitle === portfolio.topChannel;
                  return (
                    <div
                      key={ch.channelId}
                      className={cn(
                        "border rounded-lg p-4 space-y-3 transition-colors",
                        isTop ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {ch.channelThumbnail ? (
                          <img src={ch.channelThumbnail} className="h-10 w-10 rounded-full object-cover shrink-0" alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                            <Youtube className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-mono font-semibold truncate">{ch.channelTitle}</p>
                            {isTop && <Trophy className="h-3 w-3 text-yellow-400 shrink-0" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono">{ch.niche}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { label: "Subs", value: fmt(ch.stats!.subscribers) },
                          { label: "Views", value: fmt(ch.stats!.totalViews) },
                          { label: "Videos", value: ch.stats!.videoCount.toString() },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-secondary/30 rounded p-2">
                            <p className="text-sm font-mono font-bold">{value}</p>
                            <p className="text-[9px] font-mono text-muted-foreground">{label}</p>
                          </div>
                        ))}
                      </div>

                      {ch.last30d && (
                        <div className="border-t border-border pt-3 grid grid-cols-2 gap-2 text-center">
                          <div>
                            <p className="text-xs font-mono font-bold text-primary">{fmt(ch.last30d.views)}</p>
                            <p className="text-[9px] font-mono text-muted-foreground">Views (30d)</p>
                          </div>
                          <div>
                            <p className="text-xs font-mono font-bold text-green-400">+{fmt(ch.last30d.subscribersGained)}</p>
                            <p className="text-[9px] font-mono text-muted-foreground">Subs gained (30d)</p>
                          </div>
                        </div>
                      )}

                      {ch.topVideos && ch.topVideos.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[9px] font-mono uppercase text-muted-foreground">Top video</p>
                          <div className="flex items-center gap-2 bg-secondary/20 rounded p-2">
                            {ch.topVideos[0].thumbnail && (
                              <img src={ch.topVideos[0].thumbnail} className="w-12 h-8 object-cover rounded shrink-0" alt="" />
                            )}
                            <div className="min-w-0">
                              <p className="text-[10px] font-mono truncate">{ch.topVideos[0].title}</p>
                              <p className="text-[9px] text-muted-foreground">{fmt(ch.topVideos[0].views)} views</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Errored channels */}
          {errored.length > 0 && (
            <div className="flex items-start gap-2 text-yellow-400 text-xs bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-4 font-mono">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {errored.length} channel{errored.length > 1 ? "s" : ""} could not be reached (
                {errored.map(c => c.channelTitle).join(", ")}). OAuth tokens may need refreshing — reconnect via My Channels.
              </span>
            </div>
          )}

          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-400" />
                <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest">
                  AI Cross-Channel Insights
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {insights.map((ins, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-mono font-bold">{ins.pattern}</p>
                      <span className={cn(
                        "text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border shrink-0",
                        impactColor[ins.impact] || impactColor.medium
                      )}>
                        {ins.impact} impact
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{ins.finding}</p>
                    <div className="bg-primary/5 border border-primary/20 rounded p-2">
                      <div className="flex items-start gap-1.5">
                        <BarChart3 className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                        <p className="text-[11px] text-primary font-mono">{ins.action}</p>
                      </div>
                    </div>
                    <p className="text-[9px] font-mono text-muted-foreground uppercase">Apply to: {ins.applyTo}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
