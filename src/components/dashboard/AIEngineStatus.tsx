import { Brain, Cpu, Sparkles, Cog, Youtube, CheckCircle2, AlertCircle } from "lucide-react";
import { StatusIndicator } from "./StatusIndicator";
import { useAuth } from "../FirebaseProvider";
import { cn } from "@/lib/utils";

const engines = [
  { name: "Trend Intelligence", status: "online" as const, model: "GPT-5 + Gemini", tasks: "Scanning 2.4M data points", icon: Sparkles },
  { name: "Script Generator", status: "generating" as const, model: "Claude Opus 4", tasks: "Writing script #847", icon: Brain },
  { name: "Voice Synthesis", status: "online" as const, model: "ElevenLabs v3", tasks: "Ready — 0 queue", icon: Cpu },
  { name: "Video Renderer", status: "scanning" as const, model: "Runway Gen-4", tasks: "Rendering 2 videos", icon: Cog },
];

const learningMetrics = [
  { label: "Videos Analyzed", value: "12,847" },
  { label: "Patterns Learned", value: "3,291" },
  { label: "Success Rate", value: "94.2%" },
  { label: "Revenue/Video", value: "$423" },
];

export const AIEngineStatus = () => {
  const { profile } = useAuth();

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-4 w-4 text-ai-glow" />
          <h3 className="font-semibold text-sm">AI ENGINE</h3>
          <StatusIndicator status="online" />
        </div>
      </div>

      {/* YouTube Connection Status */}
      <div className={cn(
        "p-4 border-b border-border flex items-center justify-between",
        profile?.youtubeConnected ? "bg-success/5" : "bg-destructive/5"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            profile?.youtubeConnected ? "bg-success/10" : "bg-destructive/10"
          )}>
            <Youtube className={cn(
              "h-4 w-4",
              profile?.youtubeConnected ? "text-success" : "text-destructive"
            )} />
          </div>
          <div>
            <p className="text-xs font-bold font-mono uppercase tracking-tight">
              {profile?.youtubeConnected ? "YouTube Connected" : "YouTube Disconnected"}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground">
              {profile?.youtubeConnected ? profile.youtubeChannelTitle : "Setup required in sidebar"}
            </p>
          </div>
        </div>
        {profile?.youtubeConnected ? (
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
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">SELF-LEARNING METRICS</p>
        <div className="grid grid-cols-2 gap-2">
          {learningMetrics.map((m, i) => (
            <div key={i} className="bg-card rounded p-2">
              <p className="text-[10px] font-mono text-muted-foreground">{m.label}</p>
              <p className="text-sm font-mono font-bold text-primary">{m.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
