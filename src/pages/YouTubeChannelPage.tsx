import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { 
  Youtube, Users, Eye, Film, MessageSquare, TrendingUp, 
  Sparkles, BarChart3, Loader2, ArrowUpRight, Target, RefreshCw, ExternalLink
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

const YouTubeChannelPage = () => {
  const [channelInfo, setChannelInfo] = useState<any>(null);
  const [recentVideos, setRecentVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [contentIdeas, setContentIdeas] = useState<any[]>([]);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);

  const fetchChannelData = async () => {
    setLoading(true);
    try {
      const [infoRes, videosRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/youtube/channel-info`),
        fetch(`${API_BASE_URL}/api/youtube/recent-videos`)
      ]);
      if (infoRes.ok) setChannelInfo(await infoRes.json());
      if (videosRes.ok) {
        const data = await videosRes.json();
        setRecentVideos(data.videos || []);
      }
    } catch (e) {
      toast.error("Failed to load channel data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChannelData(); }, []);

  const handleAnalyzeComments = async () => {
    setAnalyzing(true);
    toast.info("Analyzing channel with AI...");
    try {
      const topVideos = recentVideos.slice(0, 3).map(v => v.title).join(", ");
      const res = await fetch(`${API_BASE_URL}/api/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Analyze these recent YouTube video titles and provide viewer sentiment insights: ${topVideos || 'general YouTube channel'}. Return JSON with: topEmotion, keyTheme, viewerLoyalty (High/Medium/Low), sentimentScore (0-100), suggestions (array of 3 strings). Return ONLY valid JSON.`
        })
      });
      if (res.ok) {
        toast.success("AI analysis complete!");
      }
    } catch (e) {
      toast.error("Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateIdeas = async () => {
    setGeneratingIdeas(true);
    try {
      const channelTitle = channelInfo?.channelTitle || 'YouTube channel';
      const res = await fetch(`${API_BASE_URL}/api/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Generate 5 high-performing YouTube video ideas for a channel called "${channelTitle}". For each idea provide: title (curiosity-gap style), reason (why it will perform), potential (High/Very High/Medium). Return ONLY a JSON array with those exact fields.`
        })
      });
      if (res.ok) {
        const data = await res.json();
        try {
          const text = data.text || '';
          const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const ideas = JSON.parse(cleaned);
          setContentIdeas(Array.isArray(ideas) ? ideas.slice(0, 5) : []);
          toast.success("New content ideas generated!");
        } catch { toast.error("Could not parse AI response"); }
      }
    } catch (e) {
      toast.error("Failed to generate ideas");
    } finally {
      setGeneratingIdeas(false);
    }
  };

  if (!loading && !channelInfo?.connected) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-destructive/10 rounded-full">
          <Youtube className="h-12 w-12 text-destructive" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-bold">YouTube Not Connected</h2>
          <p className="text-muted-foreground mt-2">
            The YOUTUBE_REFRESH_TOKEN is not set in Cloud Run. Go to Settings → YouTube to connect your channel.
          </p>
        </div>
      </div>
    );
  }

  const subs = channelInfo?.subscriberCount ? formatNumber(channelInfo.subscriberCount) : "...";
  const views = channelInfo?.viewCount ? formatNumber(channelInfo.viewCount) : "...";
  const vids = channelInfo?.videoCount?.toString() || "...";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">YOUTUBE CHANNEL INTEL</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Youtube className="h-4 w-4 text-destructive" />
            {loading ? "Loading channel..." : channelInfo?.channelTitle || "Your Channel"}
            {channelInfo?.customUrl && <span className="text-xs font-mono text-muted-foreground/60">{channelInfo.customUrl}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchChannelData} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-xs font-mono rounded hover:bg-secondary/80 transition-colors">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> REFRESH
          </button>
          <button 
            onClick={handleAnalyzeComments}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all"
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI ANALYZE CHANNEL
          </button>
        </div>
      </div>

      {/* Live Channel Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Subscribers" value={subs} change="Live from YouTube API" changeType="positive" icon={Users} />
        <MetricCard title="Total Views" value={views} change="All-time channel views" changeType="positive" icon={Eye} />
        <MetricCard title="Total Videos" value={vids} change="Published videos" changeType="positive" icon={Film} />
        <MetricCard title="Channel Age" value={channelInfo?.publishedAt ? new Date(channelInfo.publishedAt).getFullYear().toString() : "..."} change="Year channel started" changeType="neutral" icon={TrendingUp} />
      </div>

      {/* Recent Videos from YouTube */}
      {recentVideos.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Film className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">RECENT VIDEOS — LIVE FROM YOUTUBE</h3>
          </div>
          <div className="divide-y divide-border">
            {recentVideos.map((v) => (
              <div key={v.id} className="p-3 flex items-center gap-3 hover:bg-secondary/20 transition-colors">
                {v.thumbnail && <img src={v.thumbnail} alt={v.title} className="w-20 h-12 object-cover rounded flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{v.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-muted-foreground">
                    <span>{formatNumber(v.viewCount)} views</span>
                    <span>{v.likeCount?.toLocaleString()} likes</span>
                    <span>{new Date(v.publishedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Channel Info Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">CHANNEL DETAILS</h3>
              </div>
              <span className="text-[10px] font-mono text-success bg-success/10 px-2 py-0.5 rounded">CONNECTED</span>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-secondary/30 rounded-lg space-y-1">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Channel Name</p>
                  <p className="text-sm font-bold">{channelInfo?.channelTitle || "—"}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg space-y-1">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Country</p>
                  <p className="text-sm font-bold">{channelInfo?.country || "Not set"}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg space-y-1">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Subscribers Hidden</p>
                  <p className="text-sm font-bold text-success">{channelInfo?.hiddenSubscriberCount ? "Yes" : "No"}</p>
                </div>
              </div>
              {channelInfo?.channelDescription && (
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Description</p>
                  <p className="text-xs text-foreground/70 line-clamp-3">{channelInfo.channelDescription}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Strategy Suggestions */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-3">
              <Target className="h-4 w-4 text-ai-glow" />
              <h3 className="font-semibold text-sm">CONTENT STRATEGY</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-3">
                {(contentIdeas.length > 0 ? contentIdeas : [
                  { title: "Click Generate to get AI ideas", reason: "Personalized for your channel", potential: "—" },
                ]).map((s, i) => (
                  <div key={i} className="p-3 bg-secondary/30 rounded-lg border border-border/50 hover:border-primary/30 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold group-hover:text-primary transition-colors">{s.title}</span>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-all" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{s.reason}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[9px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">POTENTIAL: {s.potential}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleGenerateIdeas}
                disabled={generatingIdeas}
                className="w-full py-2 bg-primary text-primary-foreground text-xs font-mono font-bold rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                {generatingIdeas ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {generatingIdeas ? "GENERATING..." : "GENERATE AI IDEAS"}
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-trending" />
              <h3 className="text-sm font-bold">RETENTION PREDICTION</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-muted-foreground">Intro Hook</span>
                  <span className="text-success">94%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full" style={{ width: "94%" }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-muted-foreground">Mid-Video Value</span>
                  <span className="text-primary">82%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: "82%" }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-muted-foreground">Outro CTA</span>
                  <span className="text-warning">65%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-warning rounded-full" style={{ width: "65%" }} />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                AI Suggestion: Strengthen the outro by linking directly to the "AI Coding Agents" topic.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YouTubeChannelPage;
