import { ExternalLink, CheckCircle2, Youtube, Key, Globe, Cpu, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/FirebaseProvider";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { runAutonomousScan } from "@/services/automationService";
import { toast } from "sonner";

export const SetupGuidePage = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [isLaunching, setIsLaunching] = useState(false);
  const hasAutoLaunched = useRef(false);

  const steps = [
    {
      id: 1, title: "Create a YouTube Channel", done: !!profile?.youtubeConnected, icon: Youtube,
      description: "Go to YouTube Studio and create a brand account channel for your faceless content.",
      details: [
        "Go to youtube.com and sign in with Google",
        "Click your profile → 'Create a channel'",
        "Choose 'Use a custom name' (brand account)",
        "Pick a niche-relevant name — the AI will optimize around it",
      ],
      link: "https://studio.youtube.com",
    },
    {
      id: 2, title: "Enable YouTube Data API", done: !!profile?.youtubeApiKey, icon: Key,
      description: "Get API credentials to allow NeuralTube to read analytics and publish videos.",
      details: [
        "Go to Google Cloud Console → console.cloud.google.com",
        "Create a new project (e.g., 'NeuralTube')",
        "Go to APIs & Services → Library",
        "Search for 'YouTube Data API v3' and enable it",
        "Also enable 'YouTube Analytics API'",
        "Go to Credentials → Create Credentials → OAuth 2.0 Client ID",
        "Set application type to 'Web application'",
        "Add authorized redirect URI (we'll provide this after connecting)",
      ],
      link: "https://console.cloud.google.com/apis/library",
    },
    {
      id: 3, title: "Get Your API Key", done: !!profile?.youtubeApiKey, icon: Key,
      description: "Create an API key for reading public YouTube data (trends, competitor analysis).",
      details: [
        "In Google Cloud Console → Credentials",
        "Click 'Create Credentials' → 'API Key'",
        "Restrict it to YouTube Data API v3",
        "Copy the key — paste it in the Settings tab",
      ],
      link: "https://console.cloud.google.com/apis/credentials",
    },
    {
      id: 4, title: "Connect Google Trends Access", done: false, icon: Globe,
      description: "We use Google Trends data to identify emerging topics before they peak.",
      details: [
        "No API key needed — we scrape Trends data via SerpAPI",
        "You'll need a SerpAPI key (free tier: 100 searches/month)",
        "Go to serpapi.com and create an account",
        "Copy your API key from the dashboard",
      ],
      link: "https://serpapi.com",
    },
    {
      id: 5, title: "Enable Lovable Cloud Backend", done: true, icon: Cpu,
      description: "This powers the AI engine, database, scheduling, and automated publishing pipeline.",
      details: [
        "Click 'Enable Cloud' when prompted by Lovable",
        "This sets up: PostgreSQL database, Edge Functions, Storage, and AI Gateway",
        "No external accounts needed — it's built-in",
        "The AI content engine, trend scanner, and scheduler all run on this",
      ],
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === steps.length;

  // Auto-trigger first scan when all setup steps are complete
  useEffect(() => {
    if (allDone && !hasAutoLaunched.current && user?.uid) {
      hasAutoLaunched.current = true;
      toast.info("Setup complete! Auto-launching first pipeline scan...");
      runAutonomousScan("Tech & AI", user.uid)
        .then(() => {
          toast.success("First scan launched! Check your pipeline.");
          setTimeout(() => navigate("/"), 2000);
        })
        .catch(err => console.error("Auto-launch failed:", err));
    }
  }, [allDone, user?.uid]);

  const handleManualLaunch = async () => {
    if (!user?.uid) return;
    setIsLaunching(true);
    try {
      await runAutonomousScan("Tech & AI", user.uid);
      toast.success("Pipeline scan launched! Redirecting to dashboard...");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      toast.error("Failed to launch scan");
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-1">Setup Your YouTube Automation Engine</h2>
        <p className="text-sm text-muted-foreground mb-4">Complete these steps to connect NeuralTube to your YouTube channel and enable full automation.</p>
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(completedCount / steps.length) * 100}%` }} />
          </div>
          <span className="text-xs font-mono text-muted-foreground">{completedCount}/{steps.length}</span>
        </div>
      </div>

      <div className="space-y-4">
        {steps.map(step => {
          const Icon = step.icon;
          return (
            <div key={step.id} className={cn(
              "bg-card border rounded-lg overflow-hidden",
              step.done ? "border-success/30" : "border-border"
            )}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg shrink-0", step.done ? "bg-success/10" : "bg-secondary")}>
                    {step.done ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Icon className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold">Step {step.id}: {step.title}</h3>
                      {step.done && <span className="text-[9px] font-mono bg-success/20 text-success px-1.5 py-0.5 rounded">DONE</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                    <ol className="mt-3 space-y-1.5">
                      {step.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <span className="text-muted-foreground font-mono shrink-0">{i + 1}.</span>
                          <span className="text-foreground/80">{detail}</span>
                        </li>
                      ))}
                    </ol>
                    {step.link && (
                      <a href={step.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-xs font-mono text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" /> Open {new URL(step.link).hostname}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Launch CTA */}
      <div className="bg-card border border-border rounded-lg p-6 text-center space-y-3">
        <Zap className="h-8 w-8 text-warning mx-auto" />
        <h3 className="text-sm font-bold">Ready to Launch?</h3>
        <p className="text-xs text-muted-foreground">
          {allDone
            ? "All steps complete — your pipeline is ready to run."
            : `Complete ${steps.length - completedCount} more step${steps.length - completedCount !== 1 ? 's' : ''} to unlock full automation, or launch a manual scan now.`
          }
        </p>
        <button
          onClick={handleManualLaunch}
          disabled={isLaunching}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-mono font-bold mx-auto hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isLaunching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {isLaunching ? "LAUNCHING..." : "LAUNCH FIRST SCAN"}
        </button>
      </div>
    </div>
  );
};
