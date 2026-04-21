import { API_BASE_URL } from "../config/api";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Activity, LayoutDashboard, Film, Eye, Target, DollarSign, Brain, Settings,
  ChevronLeft, ChevronRight, HelpCircle, Youtube, Loader2, Shield, Rocket, Bell, Users, Search,
  ChevronDown, PlusCircle, Tv2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusIndicator } from "./dashboard/StatusIndicator";
import { useAuth } from "./FirebaseProvider";
import { auth } from "@/firebase";
import { toast } from "sonner";
import { subscribeToLogs, AILog } from "@/services/firestoreService";
import { NotificationsPanel } from "./NotificationsPanel";
import { useChannel } from "@/context/ChannelContext";

const navItems = [
  { id: "/", label: "Dashboard", icon: LayoutDashboard },
  { id: "/pipeline", label: "Pipeline", icon: Film },
  { id: "/video-editor", label: "Video Editor", icon: Eye },
  { id: "/niches", label: "Niche Intel", icon: Target },
  { id: "/revenue", label: "Revenue", icon: DollarSign },
  { id: "/ai-engine", label: "AI Engine", icon: Brain },
  { id: "/youtube-channel", label: "YouTube Channel", icon: Youtube },
  { id: "/channels", label: "My Channels", icon: Tv2 },
  { id: "/strategy", label: "Strategy Intel", icon: Rocket },
  { id: "/competitors", label: "Competitor Intel", icon: Users },
  { id: "/keywords", label: "Keyword Research", icon: Search },
  { id: "/code-auditor", label: "AI Code Auditor", icon: Shield },
  { id: "/setup", label: "Setup Guide", icon: HelpCircle },
  { id: "/settings", label: "Settings", icon: Settings },
];

export const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChannelMenu, setShowChannelMenu] = useState(false);
  const [logs, setLogs] = useState<AILog[]>([]);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { channels, activeChannel, setActiveChannelById } = useChannel();

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
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'YOUTUBE_AUTH_SUCCESS' && user) {
        const { tokens } = event.data;
        try {
          const idToken = await auth.currentUser?.getIdToken();
          const channelId = `ch_${Date.now()}`;
          const res = await fetch(`${API_BASE_URL}/api/channels/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ channelId, tokens }),
          });
          if (res.ok) {
            const data = await res.json();
            setActiveChannelById(channelId);
            toast.success(`Channel "${data.channel?.youtubeChannelTitle || 'New Channel'}" connected!`);
          } else {
            toast.error('Failed to save channel — check your credentials');
          }
        } catch {
          toast.error('Failed to save channel');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user]);


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

      {/* Channel Switcher */}
      {!collapsed && (
        <div className="p-3 border-t border-border relative">
          <button
            onClick={() => setShowChannelMenu(v => !v)}
            className="w-full flex items-center gap-2 rounded-md p-2 bg-secondary/50 hover:bg-secondary transition-colors text-left"
          >
            {activeChannel?.youtubeChannelThumbnail ? (
              <img src={activeChannel.youtubeChannelThumbnail} className="h-6 w-6 rounded-full shrink-0 object-cover" alt="" />
            ) : (
              <Youtube className="h-4 w-4 shrink-0 text-destructive" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-mono text-foreground truncate">
                {activeChannel?.youtubeChannelTitle || 'No Channel Connected'}
              </p>
              <p className="text-[9px] font-mono text-muted-foreground truncate">
                {activeChannel?.niche || 'Connect a channel'}
              </p>
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
          </button>

          {showChannelMenu && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-card border border-border rounded-md shadow-lg z-50 py-1">
              {channels.map(ch => (
                <button
                  key={ch.channelId}
                  onClick={() => { setActiveChannelById(ch.channelId); setShowChannelMenu(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary transition-colors",
                    ch.channelId === activeChannel?.channelId && "bg-primary/10"
                  )}
                >
                  {ch.youtubeChannelThumbnail ? (
                    <img src={ch.youtubeChannelThumbnail} className="h-5 w-5 rounded-full shrink-0 object-cover" alt="" />
                  ) : (
                    <Youtube className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="text-[10px] font-mono truncate flex-1">{ch.youtubeChannelTitle || ch.channelId}</span>
                  {ch.channelId === activeChannel?.channelId && (
                    <span className="text-[8px] text-primary font-mono">ACTIVE</span>
                  )}
                </button>
              ))}
              <div className="border-t border-border mt-1 pt-1">
                <button
                  onClick={() => { navigate('/channels'); setShowChannelMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary transition-colors"
                >
                  <PlusCircle className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-[10px] font-mono text-primary">Add Channel</span>
                </button>
              </div>
            </div>
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
