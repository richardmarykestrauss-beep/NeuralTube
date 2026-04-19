import { API_BASE_URL } from "../config/api";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Activity, LayoutDashboard, Film, Eye, Target, DollarSign, Brain, Settings, 
  ChevronLeft, ChevronRight, HelpCircle, Youtube, Loader2, Shield, Rocket, Bell, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusIndicator } from "./dashboard/StatusIndicator";
import { useAuth } from "./FirebaseProvider";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { toast } from "sonner";
import { subscribeToLogs, AILog } from "@/services/firestoreService";
import { NotificationsPanel } from "./NotificationsPanel";

const navItems = [
  { id: "/", label: "Dashboard", icon: LayoutDashboard },
  { id: "/pipeline", label: "Pipeline", icon: Film },
  { id: "/video-editor", label: "Video Editor", icon: Eye },
  { id: "/niches", label: "Niche Intel", icon: Target },
  { id: "/revenue", label: "Revenue", icon: DollarSign },
  { id: "/ai-engine", label: "AI Engine", icon: Brain },
  { id: "/youtube-channel", label: "YouTube Channel", icon: Youtube },
  { id: "/strategy", label: "Strategy Intel", icon: Rocket },
  { id: "/competitors", label: "Competitor Intel", icon: Users },
  { id: "/code-auditor", label: "AI Code Auditor", icon: Shield },
  { id: "/setup", label: "Setup Guide", icon: HelpCircle },
  { id: "/settings", label: "Settings", icon: Settings },
];

export const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [logs, setLogs] = useState<AILog[]>([]);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user } = useAuth();

  const unreadCount = Math.max(0, logs.length - lastSeenCount);

  useEffect(() => {
    const unsub = subscribeToLogs((data) => setLogs(data));
    return () => unsub();
  }, []);

  const handleOpenNotifications = () => {
    setShowNotifications(true);
    setLastSeenCount(logs.length);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'YOUTUBE_AUTH_SUCCESS' && user) {
        const { tokens } = event.data;
        updateDoc(doc(db, 'users', user.uid), {
          youtubeConnected: true,
          youtubeTokens: tokens,
          youtubeChannelTitle: "Connected Channel", // Will be updated on first upload
          updatedAt: new Date()
        }).then(() => {
          toast.success("YouTube Channel connected successfully!");
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user]);

  const handleConnectYoutube = async () => {
    if (!user) return;
    setConnecting(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/youtube/url`);
      const data = await response.json();
      
      if (!response.ok) {
        toast.error(data.details || data.error || "Failed to start YouTube connection");
        return;
      }

      const { url } = data;
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        url,
        "youtube_auth",
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      console.error("Failed to get auth URL:", error);
      toast.error("Failed to start YouTube connection. Is the server running?");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <aside className={cn(
      "h-screen sticky top-0 bg-card border-r border-border flex flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-56"
    )}>
      {/* Logo */}
      <div className="p-4 border-b border-border flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-ai-glow flex items-center justify-center shrink-0">
          <Activity className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden flex-1">
            <h1 className="text-sm font-bold tracking-tight">NEURAL<span className="text-primary">TUBE</span></h1>
            <p className="text-[9px] font-mono text-muted-foreground">v2.4</p>
          </div>
        )}
        <button onClick={handleOpenNotifications} className="relative shrink-0 p-1 rounded hover:bg-secondary transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications Panel */}
      <NotificationsPanel
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        logs={logs}
      />

      {/* System Status */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-border">
          <StatusIndicator status="online" label="ALL SYSTEMS GO" />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = location.pathname === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-mono transition-all",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Channel */}
      {!collapsed && (
        <div className="p-3 border-t border-border space-y-2">
          <button 
            onClick={handleConnectYoutube}
            disabled={connecting || profile?.youtubeConnected}
            className={cn(
              "w-full flex items-center gap-2 rounded-md p-2 transition-colors text-left",
              profile?.youtubeConnected ? "bg-success/10" : "bg-secondary/50 hover:bg-secondary"
            )}
          >
            {connecting ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
            ) : (
              <Youtube className={cn("h-4 w-4 shrink-0", profile?.youtubeConnected ? "text-success" : "text-destructive")} />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-mono text-foreground truncate">
                {profile?.youtubeConnected ? profile.youtubeChannelTitle : "Not Connected"}
              </p>
              <p className="text-[9px] font-mono text-muted-foreground">
                {profile?.youtubeConnected ? "Live & Syncing" : "Setup required"}
              </p>
            </div>
          </button>
          
          {profile?.youtubeConnected && (
            <button
              onClick={() => {
                // Reset connection to allow re-sync
                if (!user) return;
                updateDoc(doc(db, 'users', user.uid), {
                  youtubeConnected: false
                }).then(() => {
                  toast.info("Connection reset. Click to re-sync with updated ID.");
                });
              }}
              className="w-full flex items-center justify-center gap-2 py-1.5 border border-border rounded text-[9px] font-mono text-muted-foreground hover:bg-secondary transition-colors"
            >
              <Activity className="h-3 w-3" />
              REFRESH CONNECTION
            </button>
          )}
        </div>
      )}

      {/* Collapse */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-3 border-t border-border text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
};
