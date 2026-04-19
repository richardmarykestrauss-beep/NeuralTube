import { useState, useEffect } from "react";
import { useAuth } from "@/components/FirebaseProvider";
import { doc, updateDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/firebase";
import { toast } from "sonner";
import {
  Key, Save, Loader2, Clock, Zap, Youtube, Trash2,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/config/api";

const NICHE_OPTIONS = [
  "Tech & AI", "Finance & Crypto", "Health & Wellness", "Home & DIY",
  "Personal Development", "Gaming", "Travel", "Food & Cooking",
  "Fitness", "Business & Entrepreneurship"
];

const INTERVAL_OPTIONS = [
  { label: "Every 30 minutes", value: 30 },
  { label: "Every 1 hour", value: 60 },
  { label: "Every 2 hours", value: 120 },
  { label: "Every 4 hours", value: 240 },
  { label: "Every 6 hours", value: 360 },
  { label: "Every 12 hours", value: 720 },
  { label: "Every 24 hours", value: 1440 },
];

const UPLOAD_TIME_OPTIONS = [
  "06:00","07:00","08:00","09:00","10:00","11:00",
  "12:00","14:00","16:00","18:00","20:00","22:00"
];

interface SchedulerStatus {
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  niches: string[];
}

const SettingsPage = () => {
  const { profile, user } = useAuth();

  const [serpApiKey, setSerpApiKey] = useState("");
  const [youtubeKey, setYoutubeKey] = useState("");
  const [isSavingKeys, setIsSavingKeys] = useState(false);

  const [scheduler, setScheduler] = useState<SchedulerStatus | null>(null);
  const [schedulerEnabled, setSchedulerEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(360);
  const [selectedNiches, setSelectedNiches] = useState<string[]>(["Tech & AI", "Finance & Crypto"]);
  const [isSavingScheduler, setIsSavingScheduler] = useState(false);
  const [isRunningNow, setIsRunningNow] = useState(false);

  const [videosPerDay, setVideosPerDay] = useState(2);
  const [uploadTime, setUploadTime] = useState("10:00");
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  const [notifyOnUpload, setNotifyOnUpload] = useState(true);
  const [notifyOnError, setNotifyOnError] = useState(true);
  const [notifyOnTrend, setNotifyOnTrend] = useState(false);

  const [isWiping, setIsWiping] = useState(false);
  const [wipeConfirm, setWipeConfirm] = useState("");

  const [openSection, setOpenSection] = useState<string>("scheduler");

  useEffect(() => {
    if (profile) {
      setYoutubeKey(profile.youtubeApiKey || "");
      setSerpApiKey((profile as any).serpApiKey || "");
      setVideosPerDay((profile as any).videosPerDay || 2);
      setUploadTime((profile as any).uploadTime || "10:00");
      setSelectedNiches((profile as any).activeNiches || ["Tech & AI", "Finance & Crypto"]);
      setNotifyOnUpload((profile as any).notifyOnUpload !== false);
      setNotifyOnError((profile as any).notifyOnError !== false);
      setNotifyOnTrend((profile as any).notifyOnTrend || false);
    }
  }, [profile]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/scheduler/status`)
      .then(r => r.json())
      .then((data: SchedulerStatus) => {
        setScheduler(data);
        setSchedulerEnabled(data.enabled);
        setIntervalMinutes(data.intervalMinutes);
        if (data.niches?.length) setSelectedNiches(data.niches);
      })
      .catch(() => {});
  }, []);

  const handleSaveKeys = async () => {
    if (!user) return;
    setIsSavingKeys(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { youtubeApiKey: youtubeKey, serpApiKey });
      toast.success("API keys saved");
    } catch { toast.error("Failed to save keys"); }
    finally { setIsSavingKeys(false); }
  };

  const handleSaveScheduler = async () => {
    setIsSavingScheduler(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/scheduler/configure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: schedulerEnabled, intervalMinutes, niches: selectedNiches }),
      });
      const data = await res.json();
      setScheduler(data.scheduler);
      toast.success(schedulerEnabled ? "Scheduler enabled" : "Scheduler paused");
    } catch { toast.error("Failed to update scheduler"); }
    finally { setIsSavingScheduler(false); }
  };

  const handleRunNow = async () => {
    setIsRunningNow(true);
    try {
      await fetch(`${API_BASE_URL}/api/scheduler/run-now`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: selectedNiches[0] }),
      });
      toast.success(`Manual scan triggered for: ${selectedNiches[0]}`);
    } catch { toast.error("Failed to trigger scan"); }
    finally { setIsRunningNow(false); }
  };

  const handleSavePrefs = async () => {
    if (!user) return;
    setIsSavingPrefs(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        videosPerDay, uploadTime, activeNiches: selectedNiches,
        notifyOnUpload, notifyOnError, notifyOnTrend,
      });
      toast.success("Preferences saved");
    } catch { toast.error("Failed to save preferences"); }
    finally { setIsSavingPrefs(false); }
  };

  const handleWipeData = async () => {
    if (wipeConfirm !== "WIPE" || !user) return;
    setIsWiping(true);
    try {
      const batch = writeBatch(db);
      for (const col of ["videos", "trends", "niches", "ai_logs"]) {
        const snap = await getDocs(collection(db, col));
        snap.docs.forEach(d => batch.delete(d.ref));
      }
      await batch.commit();
      toast.success("All data wiped. Pipeline reset.");
      setWipeConfirm("");
    } catch { toast.error("Wipe failed"); }
    finally { setIsWiping(false); }
  };

  const toggleNiche = (niche: string) =>
    setSelectedNiches(prev => prev.includes(niche) ? prev.filter(n => n !== niche) : [...prev, niche]);

  const Section = ({ id, title, icon: Icon, children }: { id: string; title: string; icon: any; children: React.ReactNode }) => (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <button onClick={() => setOpenSection(openSection === id ? "" : id)}
        className="w-full p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold font-mono uppercase">{title}</h3>
        </div>
        {openSection === id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {openSection === id && <div className="p-4 pt-0 border-t border-border space-y-4">{children}</div>}
    </div>
  );

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-2xl font-bold tracking-tight">SETTINGS</h1>
        <p className="text-sm text-muted-foreground">Configure your AI Engine, scheduler, and automation preferences.</p>
      </div>

      <Section id="scheduler" title="Automation Scheduler" icon={Clock}>
        <div className="pt-4 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Auto-Scan Pipeline</p>
              <p className="text-xs text-muted-foreground">Automatically scan for trends and generate videos on a schedule</p>
            </div>
            <button onClick={() => setSchedulerEnabled(!schedulerEnabled)} className="shrink-0">
              {schedulerEnabled ? <ToggleRight className="h-8 w-8 text-success" /> : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
            </button>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-mono text-muted-foreground">SCAN INTERVAL</label>
            <select value={intervalMinutes} onChange={e => setIntervalMinutes(Number(e.target.value))}
              className="w-full bg-secondary/30 border border-border rounded px-3 py-2 text-sm font-mono">
              {INTERVAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {scheduler && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-secondary/30 rounded p-3">
                <p className="text-[10px] font-mono text-muted-foreground">STATUS</p>
                <p className={cn("text-xs font-bold font-mono mt-1", scheduler.enabled ? "text-success" : "text-muted-foreground")}>
                  {scheduler.enabled ? "RUNNING" : "PAUSED"}
                </p>
              </div>
              <div className="bg-secondary/30 rounded p-3">
                <p className="text-[10px] font-mono text-muted-foreground">SCANS RUN</p>
                <p className="text-xs font-bold font-mono mt-1">{scheduler.runCount}</p>
              </div>
              <div className="bg-secondary/30 rounded p-3">
                <p className="text-[10px] font-mono text-muted-foreground">NEXT RUN</p>
                <p className="text-xs font-bold font-mono mt-1">
                  {scheduler.nextRunAt ? new Date(scheduler.nextRunAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                </p>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={handleSaveScheduler} disabled={isSavingScheduler}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-xs font-mono font-bold hover:bg-primary/90 disabled:opacity-50">
              {isSavingScheduler ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} SAVE SCHEDULE
            </button>
            <button onClick={handleRunNow} disabled={isRunningNow}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded text-xs font-mono hover:bg-secondary/50 disabled:opacity-50">
              {isRunningNow ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />} RUN NOW
            </button>
          </div>
        </div>
      </Section>

      <Section id="niches" title="Active Niches" icon={Zap}>
        <div className="pt-4 space-y-4">
          <p className="text-xs text-muted-foreground">Select which niches the AI will scan and create content for.</p>
          <div className="flex flex-wrap gap-2">
            {NICHE_OPTIONS.map(niche => (
              <button key={niche} onClick={() => toggleNiche(niche)}
                className={cn("px-3 py-1.5 rounded text-xs font-mono border transition-colors",
                  selectedNiches.includes(niche)
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-secondary/30 border-border text-muted-foreground hover:border-primary/50")}>
                {niche}
              </button>
            ))}
          </div>
          <p className="text-[10px] font-mono text-muted-foreground">{selectedNiches.length} niche{selectedNiches.length !== 1 ? "s" : ""} selected</p>
          <button onClick={handleSavePrefs} disabled={isSavingPrefs}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-xs font-mono font-bold hover:bg-primary/90 disabled:opacity-50">
            {isSavingPrefs ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} SAVE NICHES
          </button>
        </div>
      </Section>

      <Section id="upload" title="Upload Preferences" icon={Youtube}>
        <div className="pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">VIDEOS PER DAY</label>
              <select value={videosPerDay} onChange={e => setVideosPerDay(Number(e.target.value))}
                className="w-full bg-secondary/30 border border-border rounded px-3 py-2 text-sm font-mono">
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} video{n !== 1 ? "s" : ""}/day</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">UPLOAD TIME (UTC)</label>
              <select value={uploadTime} onChange={e => setUploadTime(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded px-3 py-2 text-sm font-mono">
                {UPLOAD_TIME_OPTIONS.map(t => <option key={t} value={t}>{t} UTC</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleSavePrefs} disabled={isSavingPrefs}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-xs font-mono font-bold hover:bg-primary/90 disabled:opacity-50">
            {isSavingPrefs ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} SAVE PREFERENCES
          </button>
        </div>
      </Section>

      <Section id="notifications" title="Notifications" icon={Bell}>
        <div className="pt-4 space-y-3">
          {[
            { label: "Notify on video upload", value: notifyOnUpload, setter: setNotifyOnUpload },
            { label: "Notify on pipeline errors", value: notifyOnError, setter: setNotifyOnError },
            { label: "Notify on new trend detected", value: notifyOnTrend, setter: setNotifyOnTrend },
          ].map(({ label, value, setter }) => (
            <div key={label} className="flex items-center justify-between py-2">
              <p className="text-sm">{label}</p>
              <button onClick={() => setter(!value)}>
                {value ? <ToggleRight className="h-6 w-6 text-success" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
              </button>
            </div>
          ))}
          <button onClick={handleSavePrefs} disabled={isSavingPrefs}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-xs font-mono font-bold hover:bg-primary/90 disabled:opacity-50">
            {isSavingPrefs ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} SAVE NOTIFICATIONS
          </button>
        </div>
      </Section>

      <Section id="keys" title="API Configuration" icon={Key}>
        <div className="pt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono text-muted-foreground">YOUTUBE CONNECTION</label>
            <div className="flex items-center gap-3 bg-secondary/30 border border-border rounded p-3">
              <div className={`h-2 w-2 rounded-full shrink-0 ${profile?.youtubeConnected ? "bg-success animate-pulse" : "bg-destructive"}`} />
              <div>
                <p className="text-sm font-bold font-mono uppercase">{profile?.youtubeConnected ? "CONNECTED" : "DISCONNECTED"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {profile?.youtubeConnected ? `Channel: ${profile.youtubeChannelTitle}` : "Connect via sidebar to enable uploads."}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-mono text-muted-foreground">SERPAPI KEY (Google Trends)</label>
            <input type="password" value={serpApiKey} onChange={e => setSerpApiKey(e.target.value)}
              placeholder="Enter your SerpAPI key..."
              className="w-full bg-secondary/20 border border-border rounded px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/50" />
            <p className="text-[10px] text-muted-foreground">
              Get a free key at <a href="https://serpapi.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">serpapi.com</a> — 100 free searches/month
            </p>
          </div>
          <div className="space-y-2 opacity-60">
            <label className="text-xs font-mono text-muted-foreground">GEMINI AI ENGINE KEY</label>
            <div className="flex gap-2">
              <input type="password" value="••••••••••••••••" readOnly
                className="flex-1 bg-secondary/20 border border-border rounded px-3 py-2 text-sm font-mono cursor-not-allowed" />
              <button disabled className="px-4 py-2 bg-secondary rounded text-xs font-mono cursor-not-allowed">MANAGED</button>
            </div>
          </div>
          <button onClick={handleSaveKeys} disabled={isSavingKeys}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-xs font-mono font-bold hover:bg-primary/90 disabled:opacity-50">
            {isSavingKeys ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} SAVE API KEYS
          </button>
        </div>
      </Section>

      <div className="bg-card border border-destructive/30 rounded-lg overflow-hidden">
        <button onClick={() => setOpenSection(openSection === "danger" ? "" : "danger")}
          className="w-full p-4 flex items-center justify-between hover:bg-destructive/5 transition-colors">
          <div className="flex items-center gap-3">
            <Trash2 className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-bold font-mono uppercase text-destructive">Danger Zone</h3>
          </div>
          {openSection === "danger" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {openSection === "danger" && (
          <div className="p-4 pt-0 border-t border-destructive/20 space-y-4">
            <p className="text-xs text-muted-foreground pt-4">
              Permanently deletes all videos, trends, niches, and activity logs. Cannot be undone.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">TYPE "WIPE" TO CONFIRM</label>
              <input type="text" value={wipeConfirm} onChange={e => setWipeConfirm(e.target.value)} placeholder="WIPE"
                className="w-full bg-secondary/20 border border-destructive/30 rounded px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/30" />
            </div>
            <button onClick={handleWipeData} disabled={isWiping || wipeConfirm !== "WIPE"}
              className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded text-xs font-mono font-bold hover:bg-destructive/90 disabled:opacity-40">
              {isWiping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} WIPE ALL DATA
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
