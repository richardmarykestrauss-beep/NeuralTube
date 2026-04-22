import { AIEngineStatus } from "@/components/dashboard/AIEngineStatus";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Play, Loader2, Zap, ShieldCheck, Youtube, Settings as SettingsIcon, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { runAutonomousScan } from "@/services/automationService";
import { useAuth } from "@/components/FirebaseProvider";
import { useChannel } from "@/context/ChannelContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { API_BASE_URL } from "@/config/api";

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

const AIEnginePage = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [autoUpload, setAutoUpload] = useState(true);
  const [savingToggle, setSavingToggle] = useState(false);
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const [processingPower, setProcessingPower] = useState<string | null>(null);
  const [ytStatus, setYtStatus] = useState<{ connected: boolean; channelTitle?: string } | null>(null);
  const [ytLoading, setYtLoading] = useState(true);
  const uptimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user } = useAuth();
  const { activeChannel } = useChannel();

  // Fetch server start time and compute live uptime
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/health`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.startedAt) {
            const startMs = new Date(data.startedAt).getTime();
            const tick = () => {
              const elapsed = Math.floor((Date.now() - startMs) / 1000);
              setUptimeSeconds(elapsed);
            };
            tick();
            uptimeIntervalRef.current = setInterval(tick, 1000);
          }
          if (data.processingPower !== undefined) {
            setProcessingPower(`${data.processingPower}%`);
          }
        }
      } catch { /* health endpoint unavailable */ }
    };
    fetchHealth();
    return () => { if (uptimeIntervalRef.current) clearInterval(uptimeIntervalRef.current); };
  }, []);

  // YouTube status: connected if an active channel with tokens is selected
  const fetchYtStatus = async () => {
    setYtLoading(true);
    if (activeChannel?.youtubeTokens?.refresh_token) {
      setYtStatus({ connected: true, channelTitle: activeChannel.youtubeChannelTitle });
      setYtLoading(false);
      return;
    }
    // Fall back to env-var check for legacy setups
    try {
      const resp = await fetch(`${API_BASE_URL}/api/auth/youtube/status`);
      if (resp.ok) {
        const data = await resp.json();
        setYtStatus({ connected: data.connected, channelTitle: data.channelTitle });
      } else {
        setYtStatus({ connected: false });
      }
    } catch {
      setYtStatus({ connected: false });
    } finally {
      setYtLoading(false);
    }
  };

  useEffect(() => { fetchYtStatus(); }, [activeChannel]);

  // Load auto-upload preference from Firestore
  useEffect(() => {
    if (!user) return;
    const loadPref = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data.autoUpload === "boolean") setAutoUpload(data.autoUpload);
        }
      } catch { /* use default */ }
    };
    loadPref();
  }, [user]);

  // Toggle and persist auto-upload to Firestore
  const handleToggleAutoUpload = async () => {
    if (!user) return;
    const newVal = !autoUpload;
    setAutoUpload(newVal);
    setSavingToggle(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { autoUpload: newVal });
      toast.success(`Auto-Upload ${newVal ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to save preference");
      setAutoUpload(!newVal);
    } finally {
      setSavingToggle(false);
    }
  };

  const handleLaunch = async () => {
    if (!user) return;
    if (!activeChannel) {
      toast.error("No channel selected. Go to My Channels and connect a YouTube channel first.");
      return;
    }
    setIsRunning(true);
    toast.success("Autonomous Engine Launched!");
    const niche = activeChannel.niche || "Tech & AI";
    try {
      await runAutonomousScan(niche, user.uid, activeChannel.channelId);
    } catch (error) {
      console.error("Engine run failed:", error);
      toast.error("Engine cycle encountered an error — check Activity Feed.");
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
          {/* Auto-Upload Toggle — persisted to Firestore */}
          <div className="flex items-center gap-3 px-4 py-2 bg-card border border-border rounded-lg">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Auto-Upload</span>
              <span className={cn("text-xs font-bold font-mono", autoUpload ? "text-success" : "text-muted-foreground")}>
                {savingToggle ? "SAVING..." : autoUpload ? "ENABLED" : "DISABLED"}
              </span>
            </div>
            <button
              onClick={handleToggleAutoUpload}
              disabled={savingToggle}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50",
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

          {/* Pipeline Config — live YouTube status from backend */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold uppercase font-mono">Pipeline Config</h3>
              </div>
              <button
                onClick={fetchYtStatus}
                disabled={ytLoading}
                className="text-[10px] font-mono text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                <RefreshCw className={cn("h-3 w-3", ytLoading && "animate-spin")} />
                Refresh
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Youtube className="h-3 w-3 text-destructive" />
                  <span className="text-xs font-mono text-muted-foreground">YouTube Channel</span>
                </div>
                {ytLoading ? (
                  <span className="text-[10px] font-mono text-muted-foreground">Checking...</span>
                ) : ytStatus?.connected ? (
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-success flex items-center justify-end gap-1">
                      <CheckCircle2 className="h-3 w-3" /> CONNECTED
                    </span>
                    {ytStatus.channelTitle && (
                      <p className="text-[9px] font-mono text-muted-foreground truncate max-w-[120px]">
                        {ytStatus.channelTitle}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-destructive flex items-center justify-end gap-1">
                      <XCircle className="h-3 w-3" /> DISCONNECTED
                    </span>
                    <a href="/youtube" className="text-[9px] font-mono text-primary underline">
                      Re-authenticate →
                    </a>
                  </div>
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
              {[["Copyright Filter", "ACTIVE"], ["Brand Safety", "ACTIVE"], ["Rate Limiting", "ACTIVE"]].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-success">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Live uptime from /api/health startedAt */}
          <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-ai-glow/10 rounded-full">
                <Zap className="h-6 w-6 text-ai-glow" />
              </div>
              <div>
                <h3 className="font-bold">NeuralTube Core v2.4</h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Uptime: {uptimeSeconds > 0 ? formatUptime(uptimeSeconds) : "Connecting..."}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono text-muted-foreground">Processing Power</p>
              <p className="text-xl font-bold font-mono text-ai-glow">
                {processingPower ?? "—"}
              </p>
            </div>
          </div>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};

export default AIEnginePage;
