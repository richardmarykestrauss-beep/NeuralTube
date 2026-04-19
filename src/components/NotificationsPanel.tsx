import { X, Bell, CheckCircle2, AlertCircle, Info, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { AILog } from "@/services/firestoreService";

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  logs: AILog[];
}

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  success: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  error:   { icon: AlertCircle,  color: "text-destructive", bg: "bg-destructive/10" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  info:    { icon: Info,         color: "text-cyber", bg: "bg-cyber/10" },
};

export const NotificationsPanel = ({ open, onClose, logs }: NotificationsPanelProps) => {
  if (!open) return null;

  const recent = logs.slice(0, 30);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-80 z-50 bg-card border-l border-border flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-warning" />
            <h2 className="text-sm font-bold font-mono">NOTIFICATIONS</h2>
            <span className="text-[9px] font-mono bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">
              {recent.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Log list */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {recent.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
              <Zap className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-mono text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/60">Pipeline events will appear here</p>
            </div>
          )}
          {recent.map((log, i) => {
            const config = typeConfig[log.type] || typeConfig.info;
            const Icon = config.icon;
            return (
              <div key={log.id || i} className="p-3 hover:bg-secondary/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={cn("p-1.5 rounded shrink-0 mt-0.5", config.bg)}>
                    <Icon className={cn("h-3 w-3", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs leading-relaxed", config.color)}>{log.event}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-1">
                      {log.timestamp?.toDate
                        ? log.timestamp.toDate().toLocaleString([], {
                            month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit"
                          })
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <p className="text-[10px] font-mono text-muted-foreground text-center">
            Showing last {recent.length} events · Live from pipeline
          </p>
        </div>
      </div>
    </>
  );
};
