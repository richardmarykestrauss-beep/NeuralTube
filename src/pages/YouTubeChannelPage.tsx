import { useState, useEffect } from "react";
import { useAuth } from "@/components/FirebaseProvider";
import { 
  Youtube, Users, Eye, Film, MessageSquare, TrendingUp, 
  Sparkles, MessageCircle, ThumbsUp, BarChart3, Loader2,
  ArrowUpRight, Target
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const YouTubeChannelPage = () => {
  const { profile } = useAuth();
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyzeComments = () => {
    setAnalyzing(true);
    toast.info("Analyzing latest comment sections...");
    setTimeout(() => {
      setAnalyzing(false);
      toast.success("Analysis complete! New suggestions generated.");
    }, 2500);
  };

  if (!profile?.youtubeConnected) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-destructive/10 rounded-full">
          <Youtube className="h-12 w-12 text-destructive" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-bold">YouTube Not Connected</h2>
          <p className="text-muted-foreground mt-2">
            Connect your YouTube channel in the sidebar or setup guide to view real-time analytics and comment intelligence.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">YOUTUBE CHANNEL INTEL</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Youtube className="h-4 w-4 text-destructive" />
            {profile.youtubeChannelTitle} ({profile.youtubeChannelId})
          </p>
        </div>
        <button 
          onClick={handleAnalyzeComments}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all"
        >
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          ANALYZE COMMENTS & SENTIMENT
        </button>
      </div>

      {/* Channel Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Subscribers" value="124,842" change="+892 today" changeType="positive" icon={Users} />
        <MetricCard title="Total Views" value="4.2M" change="+180K today" changeType="positive" icon={Eye} />
        <MetricCard title="Total Videos" value="847" change="+3 today" changeType="positive" icon={Film} />
        <MetricCard title="Avg. Retention" value="68.4%" change="+2.1% this week" changeType="positive" icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Comment Analysis */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">SENTIMENT ANALYSIS</h3>
              </div>
              <span className="text-[10px] font-mono text-success bg-success/10 px-2 py-0.5 rounded">92% POSITIVE</span>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-secondary/30 rounded-lg space-y-1">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Top Emotion</p>
                  <p className="text-lg font-bold">Excitement</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg space-y-1">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Key Theme</p>
                  <p className="text-lg font-bold">AI Future</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg space-y-1">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Viewer Loyalty</p>
                  <p className="text-lg font-bold text-success">High</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-xs font-bold font-mono text-muted-foreground uppercase">RECENT VIEWER FEEDBACK</h4>
                {[
                  { user: "TechEnthusiast", comment: "The breakdown of Gemini 1.5 was incredible. Can you do one on Claude 3 next?", sentiment: "positive", suggestion: "High demand for Claude 3 content" },
                  { user: "DevLife", comment: "I love the pacing, but maybe more code examples in the next one?", sentiment: "neutral", suggestion: "Include technical deep-dives" },
                  { user: "FutureMind", comment: "This channel is literally my daily news source now. Keep it up!", sentiment: "positive", suggestion: "Maintain daily upload frequency" },
                ].map((c, i) => (
                  <div key={i} className="p-3 border border-border rounded-lg bg-secondary/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">@{c.user}</span>
                      <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded", c.sentiment === "positive" ? "bg-success/20 text-success" : "bg-warning/20 text-warning")}>
                        {c.sentiment.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 italic">"{c.comment}"</p>
                    <div className="flex items-center gap-2 text-[10px] text-primary font-mono bg-primary/5 p-1.5 rounded">
                      <Sparkles className="h-3 w-3" />
                      AI SUGGESTION: {c.suggestion}
                    </div>
                  </div>
                ))}
              </div>
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
                {[
                  { title: "Gemini vs Claude 3", reason: "High viewer request volume", potential: "High" },
                  { title: "AI Coding Agents", reason: "Emerging trend in tech niche", potential: "Very High" },
                  { title: "The Future of SaaS", reason: "Competitor gap identified", potential: "Medium" },
                ].map((s, i) => (
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
              <button className="w-full py-2 bg-secondary text-xs font-mono font-bold rounded hover:bg-secondary/80 transition-colors">
                GENERATE MORE IDEAS
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
