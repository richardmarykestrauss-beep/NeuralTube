import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "online" | "scanning" | "generating" | "idle" | "error";
  label?: string;
  className?: string;
}

const statusConfig = {
  online: { color: "bg-success", text: "text-success", label: "ONLINE" },
  scanning: { color: "bg-cyber", text: "text-cyber", label: "SCANNING" },
  generating: { color: "bg-ai-glow", text: "text-ai-glow", label: "GENERATING" },
  idle: { color: "bg-muted-foreground", text: "text-muted-foreground", label: "IDLE" },
  error: { color: "bg-destructive", text: "text-destructive", label: "ERROR" },
};

export const StatusIndicator = ({ status, label, className }: StatusIndicatorProps) => {
  const config = statusConfig[status];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("h-2 w-2 rounded-full pulse-dot", config.color)} />
      <span className={cn("text-xs font-mono uppercase tracking-wider", config.text)}>
        {label || config.label}
      </span>
    </div>
  );
};
