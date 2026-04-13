import { useState } from "react";
import { LucideIcon } from "lucide-react";
import { 
  FileText, Mic, Film, Image, Tags, Eye, BarChart3, 
  ThumbsUp, ThumbsDown, RefreshCw, Copy, Wand2, Volume2,
  Clock, Sparkles, CheckCircle2, AlertTriangle, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateVideoScript, GeneratedScript } from "@/services/geminiService";

const initialScript: GeneratedScript = {
  hook: "What if I told you that 10 AI tools are about to make 90% of developers completely obsolete? And no, this isn't clickbait — three of these tools are already being used by Fortune 500 companies to replace entire engineering teams.",
  body: `Let's start with the most terrifying one — Devin 2.0. This isn't just a coding assistant anymore. Devin 2.0 can now take a Figma design, analyze it, build the entire frontend AND backend, write tests, deploy it, and even fix bugs in production. All without a single human touching the code.

But here's what makes it truly scary — it learns from every project it completes. The more it builds, the better it gets. And right now, it's completing projects 47x faster than a senior developer.

Tool number two is even more advanced...`,
  outro: "If you found this valuable, smash that subscribe button because I'm dropping a new video every single day breaking down the AI revolution as it happens in real-time.",
  stats: {
    hookStrength: 92,
    retentionPrediction: 78,
    originality: 95,
    wordCount: 2847,
    readingTime: "11:23",
    ctrPrediction: 12.4,
  }
};

const mockThumbnails = [
  { id: 1, ctrPrediction: 12.4, label: "Variant A — Shock face + red text" },
  { id: 2, ctrPrediction: 10.8, label: "Variant B — Split screen comparison" },
  { id: 3, ctrPrediction: 9.2, label: "Variant C — Minimalist dark" },
];

const mockSEO = {
  title: "10 AI Tools Replacing Developers in 2026 (This Changes Everything)",
  description: "These 10 AI tools are making human developers obsolete. From Devin 2.0 to...",
  tags: ["AI tools 2026", "AI replacing developers", "Devin AI", "coding AI", "software engineering AI", "best AI tools", "developer tools AI", "future of coding"],
  hashtags: ["#AI", "#Tech", "#Developers", "#AITools", "#Coding"],
};

type Tab = "script" | "voiceover" | "visuals" | "thumbnail" | "seo" | "review";

export const VideoDetailEditor = () => {
  const [activeTab, setActiveTab] = useState<Tab>("script");
  const [script, setScript] = useState<GeneratedScript>(initialScript);
  const [isGenerating, setIsGenerating] = useState(false);

  const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: "script", label: "SCRIPT", icon: FileText },
    { id: "voiceover", label: "VOICEOVER", icon: Mic },
    { id: "visuals", label: "VISUALS", icon: Film },
    { id: "thumbnail", label: "THUMBNAIL", icon: Image },
    { id: "seo", label: "SEO", icon: Tags },
    { id: "review", label: "REVIEW", icon: Eye },
  ];

  const handleRegenerate = async () => {
    setIsGenerating(true);
    try {
      const newScript = await generateVideoScript("10 AI Tools Replacing Developers in 2026", "Tech & AI");
      setScript(newScript);
    } catch (error) {
      console.error("Failed to regenerate script:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-1">VIDEO #847 — TECH NICHE</p>
            <h2 className="text-lg font-bold">10 AI Tools Replacing Developers in 2026</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xl font-mono font-bold text-success">{script.stats.originality}</p>
              <p className="text-[9px] font-mono text-muted-foreground">QUALITY</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-mono font-bold text-revenue">$1,200</p>
              <p className="text-[9px] font-mono text-muted-foreground">EST. REV</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono transition-all flex-1 justify-center",
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {activeTab === "script" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            <div className="lg:col-span-2 p-6 border-r border-border relative">
              {isGenerating && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs font-mono text-primary animate-pulse">AI ENGINE GENERATING SCRIPT...</p>
                  </div>
                </div>
              )}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-trending/20 text-trending rounded">HOOK</span>
                    <span className="text-[10px] font-mono text-success">Strength: {script.stats.hookStrength}%</span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">{script.hook}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-info/20 text-info rounded">BODY</span>
                  <p className="text-sm leading-relaxed text-foreground/80 mt-2 whitespace-pre-line">{script.body}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-primary/20 text-primary rounded">CTA / OUTRO</span>
                  <p className="text-sm leading-relaxed text-foreground/80 mt-2">{script.outro}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <button 
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-xs font-mono text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <Wand2 className="h-3 w-3" /> Regenerate
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw className="h-3 w-3" /> Improve Hook
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">SCRIPT ANALYTICS</p>
              {Object.entries(script.stats).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span className={cn(
                    "text-sm font-mono font-bold",
                    typeof val === 'number' && val >= 80 ? "text-success" : typeof val === 'number' && val >= 60 ? "text-warning" : "text-foreground"
                  )}>{typeof val === 'number' && key.includes('ctr') ? `${val}%` : val}{typeof val === 'number' && !key.includes('ctr') && !key.includes('Count') && !key.includes('Time') ? '%' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "voiceover" && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-[10px] font-mono uppercase text-muted-foreground">VOICE CONFIGURATION</p>
                <div className="space-y-3">
                  {[
                    { label: "Voice Model", value: "ElevenLabs — Marcus (Deep, Authoritative)" },
                    { label: "Speaking Rate", value: "1.15x — Energetic" },
                    { label: "Emphasis Mode", value: "Dynamic — Auto-emphasize key phrases" },
                    { label: "Emotion Map", value: "Hook: Urgent → Body: Confident → CTA: Warm" },
                    { label: "Pauses", value: "Auto-pause at transitions (0.8s)" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between bg-secondary/30 rounded-md p-3">
                      <span className="text-xs font-mono text-muted-foreground">{item.label}</span>
                      <span className="text-xs font-mono text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-mono uppercase text-muted-foreground">QUALITY METRICS</p>
                <div className="space-y-3">
                  {[
                    { label: "Naturalness", score: 94, passed: true },
                    { label: "Pacing", score: 91, passed: true },
                    { label: "Emotion Accuracy", score: 88, passed: true },
                    { label: "AI Artifact Detection", score: 97, passed: true },
                  ].map(item => (
                    <div key={item.label} className="bg-secondary/30 rounded-md p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-mono text-muted-foreground">{item.label}</span>
                        <span className={cn("text-xs font-mono font-bold", item.passed ? "text-success" : "text-destructive")}>{item.score}%</span>
                      </div>
                      <div className="h-1.5 bg-card rounded-full overflow-hidden">
                        <div className="h-full bg-success rounded-full" style={{ width: `${item.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <button className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-mono w-full justify-center">
                  <Volume2 className="h-3.5 w-3.5" /> Preview Voiceover
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "thumbnail" && (
          <div className="p-6 space-y-4">
            <p className="text-[10px] font-mono uppercase text-muted-foreground">A/B THUMBNAIL VARIANTS — AI-GENERATED</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mockThumbnails.map(thumb => (
                <div key={thumb.id} className={cn(
                  "border rounded-lg overflow-hidden",
                  thumb.id === 1 ? "border-success/50" : "border-border"
                )}>
                  <div className="aspect-video bg-gradient-to-br from-secondary to-card flex items-center justify-center">
                    <Image className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono">{thumb.label}</span>
                      {thumb.id === 1 && <span className="text-[9px] font-mono text-success bg-success/20 px-1.5 py-0.5 rounded">WINNER</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-muted-foreground">CTR Prediction</span>
                      <span className={cn("text-sm font-mono font-bold", thumb.ctrPrediction >= 10 ? "text-success" : "text-warning")}>{thumb.ctrPrediction}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-xs font-mono text-muted-foreground hover:text-foreground">
                <Wand2 className="h-3 w-3" /> Generate More Variants
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-xs font-mono text-muted-foreground hover:text-foreground">
                <RefreshCw className="h-3 w-3" /> Run A/B Test
              </button>
            </div>
          </div>
        )}

        {activeTab === "seo" && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-mono uppercase text-muted-foreground mb-2">OPTIMIZED TITLE</p>
                  <div className="bg-secondary/30 rounded-md p-3">
                    <p className="text-sm font-medium">{mockSEO.title}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-1">{mockSEO.title.length}/100 characters</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-muted-foreground mb-2">DESCRIPTION</p>
                  <div className="bg-secondary/30 rounded-md p-3">
                    <p className="text-xs text-foreground/80">{mockSEO.description}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-muted-foreground mb-2">HASHTAGS</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mockSEO.hashtags.map(h => (
                      <span key={h} className="text-xs font-mono bg-info/20 text-info px-2 py-0.5 rounded">{h}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase text-muted-foreground mb-2">TAGS ({mockSEO.tags.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {mockSEO.tags.map(tag => (
                    <span key={tag} className="text-xs font-mono bg-secondary px-2 py-1 rounded text-foreground/80">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "visuals" && (
          <div className="p-6 space-y-4">
            <p className="text-[10px] font-mono uppercase text-muted-foreground">VISUAL GENERATION ENGINE</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { scene: "Opening — AI Robot typing code", duration: "0:00-0:15", status: "rendered" },
                { scene: "Developer comparison — split screen", duration: "0:15-1:30", status: "rendered" },
                { scene: "Devin 2.0 demo walkthrough", duration: "1:30-3:45", status: "rendering" },
                { scene: "Stats & graphs overlay", duration: "3:45-5:00", status: "queued" },
              ].map((scene, i) => (
                <div key={i} className="bg-secondary/30 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-24 h-14 bg-card rounded flex items-center justify-center shrink-0">
                    <Film className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{scene.scene}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{scene.duration}</p>
                    <span className={cn(
                      "text-[9px] font-mono px-1.5 py-0.5 rounded mt-1 inline-block",
                      scene.status === "rendered" ? "bg-success/20 text-success" :
                      scene.status === "rendering" ? "bg-ai-glow/20 text-ai-glow" :
                      "bg-secondary text-muted-foreground"
                    )}>{scene.status.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "review" && (
          <div className="p-6 space-y-4">
            <p className="text-[10px] font-mono uppercase text-muted-foreground">FINAL REVIEW — QUALITY ASSURANCE</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { check: "Video QA", status: "passed", detail: "No glitches detected" },
                { check: "Audio Sync", status: "passed", detail: "Perfect sync — 0ms drift" },
                { check: "Copyright Scan", status: "passed", detail: "No flagged content" },
                { check: "Monetization", status: "passed", detail: "Eligible — no restrictions" },
                { check: "Thumbnail CTR", status: "passed", detail: "12.4% predicted" },
                { check: "SEO Score", status: "passed", detail: "95/100" },
                { check: "Hook Retention", status: "warning", detail: "78% — target 80%" },
                { check: "Brand Safety", status: "passed", detail: "Family-safe content" },
              ].map((item, i) => (
                <div key={i} className={cn(
                  "bg-secondary/30 rounded-lg p-3 border",
                  item.status === "passed" ? "border-success/20" : "border-warning/20"
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    {item.status === "passed" ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                    <span className="text-xs font-mono font-bold">{item.check}</span>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
            <button className="flex items-center gap-2 px-6 py-3 rounded-lg bg-success text-success-foreground text-sm font-mono font-bold w-full justify-center hover:bg-success/90 transition-colors">
              <CheckCircle2 className="h-4 w-4" /> APPROVE & SCHEDULE PUBLISH
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
