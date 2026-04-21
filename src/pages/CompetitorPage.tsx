import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { cn } from "@/lib/utils";
import {
  Users, TrendingUp, Eye, Play, BarChart2,
  RefreshCw, ExternalLink, Loader2, AlertTriangle,
  Target, Zap, Crown
} from "lucide-react";

interface CompetitorChannel {
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  thumbnail: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  avgViewsPerVideo: number;
  uploadFrequency: string;
  topVideoTitle?: string;
  topVideoViews?: number;
  contentGap?: string;
  opportunityScore: number;
}

interface CompetitorData {
  niche: string;
  channels: CompetitorChannel[];
  fetchedAt: string;
  isFallback?: boolean;
  fallbackReason?: string;
  source?: string;
}

const NICHES = [
  "Tech & AI",
  "Finance & Crypto",
  "Health & Wellness",
  "Home & DIY",
  "Personal Development",
  "Gaming",
  "Business & Entrepreneurship",
];

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const CompetitorPage = () => {
  const [selectedNiche, setSelectedNiche] = useState("Tech & AI");
  const [data, setData] = useState<CompetitorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompetitors = async (niche: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/youtube/competitors?niche=${encodeURIComponent(niche)}`
      );
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || "Failed to fetch competitor data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitors(selectedNiche);
  }, [selectedNiche]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          COMPETITOR INTEL
        </h1>
        <p className="text-muted-foreground text-sm">
          Analyse top channels per niche — identify content gaps and upload patterns.
        </p>
      </div>

      {/* Niche selector */}
      <div className="flex flex-wrap gap-2">
        {NICHES.map((n) => (
          <button
            key={n}
            onClick={() => setSelectedNiche(n)}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-mono border transition-colors",
              selectedNiche === n
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/20 border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
            )}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => fetchCompetitors(selectedNiche)}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-secondary/30 border border-border rounded text-xs font-mono hover:bg-secondary/50 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Fallback data warning */}
      {data?.isFallback && (
        <div className="flex items-start gap-2 text-yellow-400 text-sm bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-4">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Showing estimated data — YouTube API unavailable</p>
            {data.fallbackReason && (
              <p className="text-xs text-yellow-400/70 mt-1">{data.fallbackReason}</p>
            )}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary/40" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-secondary/40 rounded w-3/4" />
                  <div className="h-2 bg-secondary/30 rounded w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-12 bg-secondary/30 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Competitor cards */}
      {!loading && data && data.channels.length > 0 && (
        <>
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span>SHOWING {data.channels.length} TOP CHANNELS FOR {data.niche.toUpperCase()}</span>
            <span>Updated {new Date(data.fetchedAt).toLocaleTimeString()}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.channels.map((ch, idx) => (
              <div
                key={ch.channelId}
                className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors"
              >
                {/* Card header */}
                <div className="p-4 flex items-center gap-3 border-b border-border/50">
                  <div className="relative flex-shrink-0">
                    <img
                      src={ch.thumbnail}
                      alt={ch.channelTitle}
                      className="w-12 h-12 rounded-full object-cover border border-border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(ch.channelTitle)}&background=random&size=48`;
                      }}
                    />
                    {idx === 0 && (
                      <div className="absolute -top-1 -right-1 bg-warning text-warning-foreground rounded-full p-0.5">
                        <Crown className="h-2.5 w-2.5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{ch.channelTitle}</p>
                    <p className="text-xs text-muted-foreground font-mono">{formatNumber(ch.subscriberCount)} subs</p>
                  </div>
                  <a
                    href={ch.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 divide-x divide-border/50 border-b border-border/50">
                  <div className="p-3 text-center">
                    <p className="text-xs font-mono text-muted-foreground flex items-center justify-center gap-1 mb-1">
                      <Eye className="h-2.5 w-2.5" /> VIEWS
                    </p>
                    <p className="text-sm font-bold">{formatNumber(ch.viewCount)}</p>
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-xs font-mono text-muted-foreground flex items-center justify-center gap-1 mb-1">
                      <Play className="h-2.5 w-2.5" /> VIDEOS
                    </p>
                    <p className="text-sm font-bold">{formatNumber(ch.videoCount)}</p>
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-xs font-mono text-muted-foreground flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="h-2.5 w-2.5" /> AVG
                    </p>
                    <p className="text-sm font-bold">{formatNumber(ch.avgViewsPerVideo)}</p>
                  </div>
                </div>

                {/* Opportunity score */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">OPPORTUNITY SCORE</span>
                    <span className={cn(
                      "font-bold",
                      ch.opportunityScore >= 75 ? "text-success" :
                      ch.opportunityScore >= 50 ? "text-warning" : "text-destructive"
                    )}>{ch.opportunityScore}/100</span>
                  </div>
                  <div className="w-full bg-secondary/30 rounded-full h-1.5">
                    <div
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        ch.opportunityScore >= 75 ? "bg-success" :
                        ch.opportunityScore >= 50 ? "bg-warning" : "bg-destructive"
                      )}
                      style={{ width: `${ch.opportunityScore}%` }}
                    />
                  </div>

                  {/* Upload frequency */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BarChart2 className="h-3 w-3" />
                    <span>Uploads: <span className="text-foreground font-mono">{ch.uploadFrequency}</span></span>
                  </div>

                  {/* Content gap */}
                  {ch.contentGap && (
                    <div className="bg-primary/5 border border-primary/20 rounded p-2">
                      <p className="text-[10px] font-mono text-primary uppercase mb-1 flex items-center gap-1">
                        <Zap className="h-2.5 w-2.5" /> CONTENT GAP
                      </p>
                      <p className="text-xs text-foreground/80">{ch.contentGap}</p>
                    </div>
                  )}

                  {/* Top video */}
                  {ch.topVideoTitle && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">TOP VIDEO</p>
                      <p className="text-xs text-foreground/80 line-clamp-2">{ch.topVideoTitle}</p>
                      {ch.topVideoViews && (
                        <p className="text-[10px] font-mono text-muted-foreground">{formatNumber(ch.topVideoViews)} views</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !error && data && data.channels.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
          <Users className="h-10 w-10" />
          <p className="text-sm font-mono">No competitor data found for {selectedNiche}</p>
          <button
            onClick={() => fetchCompetitors(selectedNiche)}
            className="text-xs text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
};

export default CompetitorPage;
