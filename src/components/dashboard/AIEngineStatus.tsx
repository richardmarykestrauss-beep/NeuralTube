import { useEffect, useState } from "react";
import { Brain, Cpu, Sparkles, Cog, Youtube, CheckCircle2, AlertCircle } from "lucide-react";
import { StatusIndicator } from "./StatusIndicator";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/config/api";

const engines = [
  { name: "Trend Intelligence", status: "online" as const, model: "Gemini 2.5 Flash", tasks: "AI-powered niche scanning", icon: Sparkles },
  { name: "Script Generator", status: "online" as const, model: "Gemini 2.5 Flash", tasks: "Retention-optimized scripts", icon: Brain },
  { name: "Voice Synthesis", status: "online" as const, model: "Google Cloud TTS", tasks: "Neural2 voice synthesis", icon: Cpu },
  { name: "YouTube Uploader", status: "online" as const, model: "YouTube Data API v3", tasks: "Auto-upload pipeline ready", icon: Cog },
];

export const AIEngineStatus = () => {
  const [ytStatus, setYtStatus] = useState<any>(null);
  const [channelInfo, setChannelInfo] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/auth/youtube/status`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setYtStatus(d))
      .catch(() => {});
    fetch(`${API_BASE_URL}/api/youtube/channel-info`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setChannelInfo(d))
      .catch(() => {});
  }, []);

  const isConnected = ytStatus?.ready && channelInfo?.connected;
  const channelName = channelInfo?.channelTitle || (ytStatus?.ready ? "Channel connected" : "Not connected");

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-4 w-4 text-ai-glow" />
          <h3 className="font-semibold text-sm">AI ENGINE</h3>
          <StatusIndicator status="online" />
        </div>
      </div>

      {/* YouTube Connection Status — Live from Backend */}
      <div className={cn(
        "p-4 border-b border-border flex items-center justify-between",
        isConnected ? "bg-success/5" : "bg-destructive/5"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", isConnected ? "bg-success/10" : "bg-destructive/10")}>
            <Youtube className={cn("h-4 w-4", isConnected ? "text-success" : "text-destructive")} />
          </div>
          <div>
            <p className="text-xs font-bold font-mono uppercase tracking-tight">
              {isConnected ? "YouTube Connected" : "YouTube Not Connected"}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground">{channelName}</p>
          </div>
        </div>
        {isConnected ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <AlertCircle className="h-4 w-4 text-destructive animate-pulse" />
        )}
      </div>

      <div className="divide-y divide-border">
        {engines.map((engine, i) => {
          const Icon = engine.icon;
          return (
            <div key={i} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-ai-glow" />
                <div>
                  <p className="text-sm font-medium">{engine.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{engine.model}</p>
                </div>
              </div>
              <div className="text-right">
                <StatusIndicator status={engine.status} />
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{engine.tasks}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-border bg-secondary/30">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">LIVE SYSTEM STATUS</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-card rounded p-2">
            <p className="text-[10px] font-mono text-muted-foreground">AI Provider</p>
            <p className="text-sm font-mono font-bold text-primary">Gemini 2.5</p>
          </div>
          <div className="bg-card rounded p-2">
            <p className="text-[10px] font-mono text-muted-foreground">TTS Engine</p>
            <p className="text-sm font-mono font-bold text-primary">Google TTS</p>
          </div>
          <div className="bg-card rounded p-2">
            <p className="text-[10px] font-mono text-muted-foreground">YouTube API</p>
            <p className={`text-sm font-mono font-bold ${ytStatus?.ready ? 'text-success' : 'text-destructive'}`}>
              {ytStatus?.ready ? 'Ready' : 'Not Set'}
            </p>
          </div>
          <div className="bg-card rounded p-2">
            <p className="text-[10px] font-mono text-muted-foreground">Backend</p>
            <p className="text-sm font-mono font-bold text-success">Cloud Run</p>
          </div>
        </div>
      </div>
    </div>
  );
};
