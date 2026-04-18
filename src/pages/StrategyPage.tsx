import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { cn } from "@/lib/utils";
import {
  Zap, Target, Shield, TrendingUp, DollarSign, Scissors,
  Loader2, ChevronDown, ChevronUp, ExternalLink, CheckCircle2,
  AlertTriangle, BarChart3, Sparkles, Brain, Youtube
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Niche {
  id: string; name: string; rpm: number; cpm: number;
  competition: string; channels: number; growth: string;
  faceless: boolean; saturation: number; opportunity: number;
  topGap: string; monthlyRev: string; tags: string[];
}

interface Hook {
  patternInterrupt: string; openLoop: string; credibilityAnchor: string;
  title: string; thumbnailConcept: string; psychologyTrigger: string;
}

interface Short {
  title: string; shortsScript: string; openingHook: string;
  ctaLine: string; postingStrategy: string; retentionScore: number;
}

interface AffiliateProgram {
  name: string; commissionRate: string; avgTicket: string; url?: string;
}

interface MonetizationData {
  adSenseProjection: string; affiliateStack: AffiliateProgram[];
  digitalProducts: { name: string; pricePoint: string; format: string }[];
  superThanksStrategy: string; sponsorshipTargets: string;
  roadmap90Days: string; estimatedMonthlyAt100KViews: string;
  estimatedMonthlyAt1MViews: string;
}

// ─── Niche Card ───────────────────────────────────────────────────────────────
const NicheCard = ({ niche, onSelect, selected }: { niche: Niche; onSelect: (n: Niche) => void; selected: boolean }) => {
  const competitionColor = {
    "Ultra-Low": "text-success", "Low": "text-primary", "Medium": "text-warning", "High": "text-destructive"
  }[niche.competition] || "text-muted-foreground";

  return (
    <div
      onClick={() => onSelect(niche)}
      className={cn(
        "p-4 rounded-lg border cursor-pointer transition-all hover:border-primary/60",
        selected ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-secondary/30"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-sm font-semibold leading-tight">{niche.name}</p>
          <p className={cn("text-xs font-mono mt-0.5", competitionColor)}>{niche.competition} Competition · {niche.growth} Growth</p>
        </div>
        <div className="text-right shrink-0 ml-3">
          <p className="text-sm font-mono font-bold text-revenue">${niche.rpm.toFixed(2)} RPM</p>
          <p className="text-xs text-muted-foreground font-mono">{niche.monthlyRev}/mo</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] font-mono text-muted-foreground">SATURATION</span>
            <span className="text-[10px] font-mono text-destructive">{niche.saturation}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-destructive/70 rounded-full" style={{ width: `${niche.saturation}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] font-mono text-muted-foreground">OPPORTUNITY</span>
            <span className="text-[10px] font-mono text-success">{niche.opportunity}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-success rounded-full" style={{ width: `${niche.opportunity}%` }} />
          </div>
        </div>
      </div>
      <div className="bg-secondary/50 rounded px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-3 w-3 text-warning shrink-0" />
          <p className="text-xs text-warning font-mono truncate">GAP: {niche.topGap}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {niche.tags.map(tag => (
          <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5 bg-primary/10 text-primary rounded uppercase">{tag}</span>
        ))}
      </div>
    </div>
  );
};

// ─── Hook Card ────────────────────────────────────────────────────────────────
const HookCard = ({ hook, index }: { hook: Hook; index: number }) => {
  const [expanded, setExpanded] = useState(index === 0);
  const triggerColors: Record<string, string> = {
    curiosity_gap: "bg-primary/20 text-primary",
    fomo: "bg-warning/20 text-warning",
    social_proof: "bg-success/20 text-success",
    controversy: "bg-destructive/20 text-destructive",
    identity_trigger: "bg-cyber/20 text-cyber",
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <span className="text-xs font-mono text-muted-foreground w-5">#{index + 1}</span>
          <div>
            <p className="text-sm font-medium leading-tight">{hook.title}</p>
            <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded uppercase mt-1 inline-block", triggerColors[hook.psychologyTrigger] || "bg-secondary text-muted-foreground")}>
              {hook.psychologyTrigger?.replace(/_/g, " ")}
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div>
            <p className="text-[10px] font-mono text-destructive uppercase mb-1">Pattern Interrupt (0-3s)</p>
            <p className="text-sm text-foreground bg-destructive/5 rounded p-2">{hook.patternInterrupt}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono text-warning uppercase mb-1">Open Loop (3-15s)</p>
            <p className="text-sm text-foreground bg-warning/5 rounded p-2">{hook.openLoop}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono text-success uppercase mb-1">Credibility Anchor (15-30s)</p>
            <p className="text-sm text-foreground bg-success/5 rounded p-2">{hook.credibilityAnchor}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono text-primary uppercase mb-1">Thumbnail Concept</p>
            <p className="text-sm text-foreground bg-primary/5 rounded p-2">{hook.thumbnailConcept}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Strategy Page ───────────────────────────────────────────────────────
const StrategyPage = () => {
  const [activeTab, setActiveTab] = useState<"niches" | "hooks" | "humanize" | "shorts" | "monetize">("niches");
  const [niches, setNiches] = useState<Niche[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<Niche | null>(null);
  const [loading, setLoading] = useState(false);

  // Hook Generator state
  const [hookTopic, setHookTopic] = useState("");
  const [hooks, setHooks] = useState<Hook[]>([]);

  // Humanizer state
  const [humanizeScript, setHumanizeScript] = useState("");
  const [humanizeResult, setHumanizeResult] = useState<any>(null);

  // Shorts state
  const [shortsScript, setShortsScript] = useState("");
  const [shortsTitle, setShortsTitle] = useState("");
  const [shorts, setShorts] = useState<Short[]>([]);

  // Monetize state
  const [monetizeData, setMonetizeData] = useState<MonetizationData | null>(null);

  // Title optimizer state
  const [titleInput, setTitleInput] = useState("");
  const [titleResult, setTitleResult] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/strategy/niches`)
      .then(r => r.json())
      .then(d => setNiches(d.niches || []))
      .catch(() => {});
  }, []);

  const generateHooks = async () => {
    if (!hookTopic.trim()) return toast.error("Enter a topic first");
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/strategy/hooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: hookTopic, niche: selectedNiche?.name })
      });
      const d = await r.json();
      if (d.hooks) { setHooks(d.hooks); toast.success("5 hooks generated!"); }
      else toast.error(d.error || "Failed");
    } catch { toast.error("Connection error"); }
    setLoading(false);
  };

  const humanizeScriptFn = async () => {
    if (!humanizeScript.trim()) return toast.error("Paste a script first");
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/strategy/humanize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: humanizeScript, niche: selectedNiche?.name })
      });
      const d = await r.json();
      if (d.humanizedScript) { setHumanizeResult(d); toast.success("Script humanized — AI risk reduced!"); }
      else toast.error(d.error || "Failed");
    } catch { toast.error("Connection error"); }
    setLoading(false);
  };

  const extractShorts = async () => {
    if (!shortsScript.trim()) return toast.error("Paste a script first");
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/strategy/shorts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: shortsScript, title: shortsTitle, niche: selectedNiche?.name })
      });
      const d = await r.json();
      if (d.shorts) { setShorts(d.shorts); toast.success(`${d.shorts.length} Shorts extracted!`); }
      else toast.error(d.error || "Failed");
    } catch { toast.error("Connection error"); }
    setLoading(false);
  };

  const getMonetizationPlan = async () => {
    if (!selectedNiche) return toast.error("Select a niche first");
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/strategy/monetize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: selectedNiche.name, channelSize: "new", currentRevenue: 0 })
      });
      const d = await r.json();
      if (d.adSenseProjection) { setMonetizeData(d); toast.success("Monetization plan ready!"); }
      else toast.error(d.error || "Failed");
    } catch { toast.error("Connection error"); }
    setLoading(false);
  };

  const optimizeTitle = async () => {
    if (!titleInput.trim()) return toast.error("Enter a title first");
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/strategy/optimize-title`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleInput, niche: selectedNiche?.name })
      });
      const d = await r.json();
      if (d.titleVariations) { setTitleResult(d); toast.success("Title optimized!"); }
      else toast.error(d.error || "Failed");
    } catch { toast.error("Connection error"); }
    setLoading(false);
  };

  const tabs = [
    { id: "niches", label: "Niche Intel", icon: Target },
    { id: "hooks", label: "Hook Generator", icon: Zap },
    { id: "humanize", label: "AI Evasion", icon: Shield },
    { id: "shorts", label: "Shorts Funnel", icon: Scissors },
    { id: "monetize", label: "Revenue Stack", icon: DollarSign },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            STRATEGY INTELLIGENCE
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Algorithm hacking, AI-evasion, retention psychology & revenue maximization</p>
        </div>
        {selectedNiche && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg">
            <Target className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs font-mono text-muted-foreground">ACTIVE NICHE</p>
              <p className="text-sm font-bold text-primary">{selectedNiche.name}</p>
            </div>
            <span className="text-xs font-mono text-revenue ml-2">${selectedNiche.rpm.toFixed(2)} RPM</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/30 p-1 rounded-lg overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-mono font-medium transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── NICHE INTEL TAB ── */}
      {activeTab === "niches" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="text-primary font-semibold">Select a niche</span> to activate it across all strategy tools. Data sourced from real creator dashboards (OutlierKit, March 2026).
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {niches.map(n => (
              <NicheCard key={n.id} niche={n} onSelect={setSelectedNiche} selected={selectedNiche?.id === n.id} />
            ))}
          </div>
        </div>
      )}

      {/* ── HOOK GENERATOR TAB ── */}
      {activeTab === "hooks" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-warning" />
              <h3 className="font-semibold text-sm">PSYCHOLOGICAL HOOK GENERATOR</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-warning/20 text-warning rounded">RETENTION ENGINE</span>
            </div>
            <p className="text-xs text-muted-foreground">Generates 5 hooks using curiosity gaps, FOMO, pattern interrupts, and identity triggers — the exact psychology that keeps viewers watching past 30 seconds.</p>
            <div className="flex gap-3">
              <input
                value={hookTopic}
                onChange={e => setHookTopic(e.target.value)}
                onKeyDown={e => e.key === "Enter" && generateHooks()}
                placeholder={selectedNiche ? `e.g. How to make money with ${selectedNiche.name}` : "Enter your video topic..."}
                className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
              <button
                onClick={generateHooks}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-mono font-bold hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Generate
              </button>
            </div>

            {/* Title Optimizer inline */}
            <div className="border-t border-border pt-4">
              <p className="text-xs font-mono text-muted-foreground mb-2">TITLE CTR OPTIMIZER</p>
              <div className="flex gap-3">
                <input
                  value={titleInput}
                  onChange={e => setTitleInput(e.target.value)}
                  placeholder="Paste your current title to optimize..."
                  className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
                <button
                  onClick={optimizeTitle}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-cyber/20 text-cyber border border-cyber/30 rounded-lg text-sm font-mono font-bold hover:bg-cyber/30 disabled:opacity-50 transition-all"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                  Optimize
                </button>
              </div>
            </div>
          </div>

          {/* Title Results */}
          {titleResult && (
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Title Variations</h4>
                <span className="text-xs font-mono text-muted-foreground">Original CTR: {titleResult.originalCTREstimate}</span>
              </div>
              {(titleResult.titleVariations || []).map((v: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
                  <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">#{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{v.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-primary/20 text-primary rounded">{v.psychTrigger?.replace(/_/g, " ")}</span>
                      <span className="text-[10px] font-mono text-success">CTR: {v.predictedCTR}</span>
                    </div>
                    {v.thumbnailConcept && <p className="text-xs text-muted-foreground mt-1">Thumbnail: {v.thumbnailConcept}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Hook Results */}
          {hooks.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold font-mono text-muted-foreground uppercase">Generated Hooks</h4>
              {hooks.map((hook, i) => <HookCard key={i} hook={hook} index={i} />)}
            </div>
          )}
        </div>
      )}

      {/* ── AI EVASION TAB ── */}
      {activeTab === "humanize" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-success" />
              <h3 className="font-semibold text-sm">AI-DETECTION EVASION ENGINE</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-destructive/20 text-destructive rounded">DEMONETIZATION SHIELD</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {["Adds unique POV & data points", "Varies sentence rhythm & structure", "Injects human moments & imperfections"].map(item => (
                <div key={item} className="flex items-center gap-2 p-2 bg-success/5 border border-success/20 rounded">
                  <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
            <textarea
              value={humanizeScript}
              onChange={e => setHumanizeScript(e.target.value)}
              placeholder="Paste your AI-generated script here to humanize it and reduce demonetization risk..."
              rows={8}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none font-mono"
            />
            <button
              onClick={humanizeScriptFn}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-success text-white rounded-lg text-sm font-mono font-bold hover:bg-success/90 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              Humanize & Protect
            </button>
          </div>

          {humanizeResult && (
            <div className="space-y-4">
              {/* Risk scores */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-xs font-mono text-muted-foreground mb-2">AI DETECTION RISK</p>
                  <div className="flex items-end gap-2">
                    <span className={cn("text-3xl font-bold font-mono", humanizeResult.aiRiskScore < 30 ? "text-success" : humanizeResult.aiRiskScore < 60 ? "text-warning" : "text-destructive")}>
                      {humanizeResult.aiRiskScore}
                    </span>
                    <span className="text-muted-foreground text-sm mb-1">/100 (lower = safer)</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full mt-2 overflow-hidden">
                    <div className={cn("h-full rounded-full", humanizeResult.aiRiskScore < 30 ? "bg-success" : humanizeResult.aiRiskScore < 60 ? "bg-warning" : "bg-destructive")} style={{ width: `${humanizeResult.aiRiskScore}%` }} />
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-xs font-mono text-muted-foreground mb-2">UNIQUENESS SCORE</p>
                  <div className="flex items-end gap-2">
                    <span className={cn("text-3xl font-bold font-mono", humanizeResult.uniquenessScore > 70 ? "text-success" : humanizeResult.uniquenessScore > 40 ? "text-warning" : "text-destructive")}>
                      {humanizeResult.uniquenessScore}
                    </span>
                    <span className="text-muted-foreground text-sm mb-1">/100</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${humanizeResult.uniquenessScore}%` }} />
                  </div>
                </div>
              </div>
              {/* Changes made */}
              {humanizeResult.changesMade?.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-xs font-mono text-muted-foreground mb-3">CHANGES APPLIED</p>
                  <div className="space-y-2">
                    {humanizeResult.changesMade.map((change: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">{change}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Humanized script */}
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs font-mono text-muted-foreground mb-3">HUMANIZED SCRIPT</p>
                <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed bg-secondary/30 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {humanizeResult.humanizedScript}
                </pre>
                <button
                  onClick={() => { navigator.clipboard.writeText(humanizeResult.humanizedScript); toast.success("Copied!"); }}
                  className="mt-3 text-xs font-mono text-primary hover:underline"
                >
                  Copy to clipboard
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SHORTS FUNNEL TAB ── */}
      {activeTab === "shorts" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-cyber" />
              <h3 className="font-semibold text-sm">SHORTS FUNNEL BUILDER</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-cyber/20 text-cyber rounded">SUBSCRIBER ACCELERATOR</span>
            </div>
            <p className="text-xs text-muted-foreground">Extracts 3 standalone YouTube Shorts from your long-form script. Each Short drives viewers to the full video, creating a subscriber acquisition funnel.</p>
            <input
              value={shortsTitle}
              onChange={e => setShortsTitle(e.target.value)}
              placeholder="Long-form video title..."
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <textarea
              value={shortsScript}
              onChange={e => setShortsScript(e.target.value)}
              placeholder="Paste your long-form video script here..."
              rows={8}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none font-mono"
            />
            <button
              onClick={extractShorts}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-cyber/20 text-cyber border border-cyber/30 rounded-lg text-sm font-mono font-bold hover:bg-cyber/30 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
              Extract Shorts
            </button>
          </div>

          {shorts.length > 0 && (
            <div className="space-y-4">
              {shorts.map((short, i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Youtube className="h-4 w-4 text-destructive" />
                      <h4 className="text-sm font-semibold">{short.title || `Short #${i + 1}`}</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("text-xs font-mono px-2 py-0.5 rounded", short.postingStrategy === "before" ? "bg-warning/20 text-warning" : short.postingStrategy === "same-day" ? "bg-primary/20 text-primary" : "bg-success/20 text-success")}>
                        Post: {short.postingStrategy}
                      </span>
                      <span className="text-xs font-mono text-success">Retention: {short.retentionScore}/100</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-mono text-destructive uppercase mb-1">Opening Hook (3s)</p>
                      <p className="text-sm bg-destructive/5 rounded p-2">{short.openingHook}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-primary uppercase mb-1">End Screen CTA</p>
                      <p className="text-sm bg-primary/5 rounded p-2">{short.ctaLine}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Full Short Script</p>
                    <pre className="text-sm whitespace-pre-wrap font-sans bg-secondary/30 rounded p-3 max-h-48 overflow-y-auto">{short.shortsScript}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── REVENUE STACK TAB ── */}
      {activeTab === "monetize" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-revenue" />
              <h3 className="font-semibold text-sm">REVENUE STACK ADVISOR</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-revenue/20 text-revenue rounded">$2K/DAY ROADMAP</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedNiche ? `Generating complete monetization plan for: ${selectedNiche.name}` : "Select a niche in the Niche Intel tab first, then generate your revenue stack."}
            </p>
            <button
              onClick={getMonetizationPlan}
              disabled={loading || !selectedNiche}
              className="flex items-center gap-2 px-6 py-2.5 bg-revenue/20 text-revenue border border-revenue/30 rounded-lg text-sm font-mono font-bold hover:bg-revenue/30 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
              {selectedNiche ? `Generate Revenue Plan for ${selectedNiche.name}` : "Select a niche first"}
            </button>
          </div>

          {monetizeData && (
            <div className="space-y-4">
              {/* Revenue projections */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-xs font-mono text-muted-foreground mb-1">AT 100K VIEWS/MONTH</p>
                  <p className="text-2xl font-bold font-mono text-revenue">{monetizeData.estimatedMonthlyAt100KViews}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-xs font-mono text-muted-foreground mb-1">AT 1M VIEWS/MONTH</p>
                  <p className="text-2xl font-bold font-mono text-revenue">{monetizeData.estimatedMonthlyAt1MViews}</p>
                </div>
              </div>

              {/* AdSense */}
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs font-mono text-muted-foreground mb-2">ADSENSE PROJECTION</p>
                <p className="text-sm text-foreground">{monetizeData.adSenseProjection}</p>
              </div>

              {/* Affiliate Stack */}
              {monetizeData.affiliateStack?.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-xs font-mono text-muted-foreground mb-3">AFFILIATE STACK</p>
                  <div className="space-y-2">
                    {monetizeData.affiliateStack.map((aff: AffiliateProgram, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                        <div>
                          <p className="text-sm font-medium">{aff.name}</p>
                          <p className="text-xs text-muted-foreground">Avg ticket: {aff.avgTicket}</p>
                        </div>
                        <span className="text-sm font-mono font-bold text-revenue">{aff.commissionRate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Digital Products */}
              {monetizeData.digitalProducts?.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-xs font-mono text-muted-foreground mb-3">DIGITAL PRODUCTS TO CREATE</p>
                  <div className="space-y-2">
                    {monetizeData.digitalProducts.map((prod: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                        <div>
                          <p className="text-sm font-medium">{prod.name}</p>
                          <p className="text-xs text-muted-foreground">{prod.format}</p>
                        </div>
                        <span className="text-sm font-mono font-bold text-primary">{prod.pricePoint}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 90-Day Roadmap */}
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs font-mono text-muted-foreground mb-2">90-DAY ROADMAP TO $2K/DAY</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{monetizeData.roadmap90Days}</p>
              </div>

              {/* Super Thanks */}
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs font-mono text-muted-foreground mb-2">SUPER THANKS & SPONSORSHIPS</p>
                <p className="text-sm text-foreground mb-2">{monetizeData.superThanksStrategy}</p>
                <p className="text-sm text-muted-foreground">{monetizeData.sponsorshipTargets}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StrategyPage;
