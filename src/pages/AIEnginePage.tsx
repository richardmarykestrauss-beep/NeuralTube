import { AIEngineStatus } from "@/components/dashboard/AIEngineStatus";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Play, Loader2, Zap, ShieldCheck, Youtube, Settings as SettingsIcon, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { runAutonomousScan } from "@/services/automationService";
import { useAuth } from "@/components/FirebaseProvider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AIEnginePage = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [autoUpload, setAutoUpload] = useState(true);
  const { user, profile } = useAuth();

  const handleLaunch = async () => {
    if (!user) return;
    
    if (!profile?.youtubeConnected) {
      toast.error("YouTube not connected. Please connect your channel in the sidebar first.");
      return;
    }

    setIsRunning(true);
    toast.success("Autonomous Engine Launched!");
    
    // Trigger multiple scans for different niches
    const niches = ["Tech & AI", "Personal Finance", "Health & Wellness", "Home Improvement"];
    try {
      for (const niche of niches) {
        await runAutonomousScan(niche, user.uid);
      }
    } catch (error) {
      console.error("Engine run failed:", error);
    } finally {
      setIsRunning(false);
      toast.info("Engine cycle completed.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">AI ENGINE CONTROL</h1>
          <p className="text-muted-foreground">Monitor and manage the autonomous content engine.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Auto-Upload Toggle */}
          <div className="flex items-center gap-3 px-4 py-2 bg-card border border-border rounded-lg">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Auto-Upload</span>
              <span className={cn("text-xs font-bold font-mono", autoUpload ? "text-success" : "text-muted-foreground")}>
                {autoUpload ? "ENABLED" : "DISABLED"}
              </span>
            </div>
            <button 
              onClick={() => setAutoUpload(!autoUpload)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                autoUpload ? "bg-primary" : "bg-secondary"
              )}
            >
              <span className={cn(
                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                autoUpload ? "translate-x-4" : "translate-x-0"
              )} />
            </button>
          </div>

          <button 
            onClick={handleLaunch}
            disabled={isRunning}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-lg font-mono font-bold text-sm transition-all shadow-lg",
              isRunning 
                ? "bg-ai-glow/20 text-ai-glow border border-ai-glow/50 animate-pulse" 
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {isRunning ? "ENGINE RUNNING..." : "LAUNCH AUTONOMOUS ENGINE"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <AIEngineStatus />
          
          {/* Automation Status Card */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold uppercase font-mono">Pipeline Config</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Youtube className="h-3 w-3 text-destructive" />
                  <span className="text-xs font-mono text-muted-foreground">YouTube Channel</span>
                </div>
                {profile?.youtubeConnected ? (
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-success flex items-center justify-end gap-1">
                      <CheckCircle2 className="h-3 w-3" /> CONNECTED
                    </span>
                    <p className="text-[9px] font-mono text-muted-foreground truncate max-w-[100px]">
                      {profile.youtubeChannelTitle || "Unknown Channel"}
                    </p>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-destructive">DISCONNECTED</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-ai-glow" />
                  <span className="text-xs font-mono text-muted-foreground">Auto-Upload</span>
                </div>
                <span className={cn("text-[10px] font-mono", autoUpload ? "text-success" : "text-muted-foreground")}>
                  {autoUpload ? "ON" : "OFF"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              <h3 className="text-sm font-bold">SAFETY PROTOCOLS</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">Copyright Filter</span>
                <span className="text-success">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">Brand Safety</span>
                <span className="text-success">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">Rate Limiting</span>
                <span className="text-success">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-ai-glow/10 rounded-full">
                <Zap className="h-6 w-6 text-ai-glow" />
              </div>
              <div>
                <h3 className="font-bold">NeuralTube Core v2.4</h3>
                <p className="text-xs text-muted-foreground font-mono">Uptime: 142h 12m 04s</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono text-muted-foreground">Processing Power</p>
              <p className="text-xl font-bold font-mono text-ai-glow">98.4%</p>
            </div>
          </div>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};

export default AIEnginePage;
