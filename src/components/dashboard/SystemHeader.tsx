import { Activity, Bell, Settings, Shield } from "lucide-react";
import { StatusIndicator } from "./StatusIndicator";

export const SystemHeader = () => {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-ai-glow flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">NEURAL<span className="text-primary">TUBE</span></h1>
              <p className="text-[10px] font-mono text-muted-foreground">AUTONOMOUS CONTENT ENGINE v2.4</p>
            </div>
          </div>
          <div className="h-6 w-px bg-border" />
          <StatusIndicator status="online" label="ALL SYSTEMS OPERATIONAL" />
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right mr-3">
            <p className="text-xs font-mono text-muted-foreground">TODAY'S REVENUE</p>
            <p className="text-lg font-mono font-bold text-revenue text-glow-revenue">$2,847.32</p>
          </div>
          <div className="h-6 w-px bg-border" />
          <button className="p-2 rounded-md hover:bg-secondary transition-colors relative">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <div className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-trending rounded-full" />
          </button>
          <button className="p-2 rounded-md hover:bg-secondary transition-colors">
            <Shield className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="p-2 rounded-md hover:bg-secondary transition-colors">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
};
