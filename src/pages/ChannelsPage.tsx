import { useState } from "react";
import { auth } from "@/firebase";
import { API_BASE_URL } from "@/config/api";
import { deleteChannel } from "@/services/firestoreService";
import { useChannel } from "@/context/ChannelContext";
import { useAuth } from "@/components/FirebaseProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Youtube, PlusCircle, Trash2, Loader2, CheckCircle2, AlertTriangle, Tv2, RefreshCw
} from "lucide-react";

const NICHE_OPTIONS = [
  "Tech & AI", "Finance & Crypto", "Health & Wellness", "Home & DIY",
  "Personal Development", "Gaming", "Travel", "Food & Cooking",
  "Fitness", "Business & Entrepreneurship",
  "Betrayal & Revenge", "Legal & Court Drama", "Manhwa & Webtoon",
  "Soundscapes & Healing Audio", "Literary Analysis",
];

export default function ChannelsPage() {
  const { user } = useAuth();
  const { channels, activeChannel, setActiveChannelById } = useChannel();
  const [connecting, setConnecting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleConnectNew = async () => {
    if (!user) return;
    setConnecting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/youtube/url`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to start OAuth"); return; }
      const w = 600, h = 700;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      window.open(data.url, "youtube_auth", `width=${w},height=${h},left=${left},top=${top}`);
    } catch {
      toast.error("Failed to start YouTube connection. Is the server running?");
    } finally {
      setConnecting(false);
    }
  };

  const handleDelete = async (channelId: string) => {
    if (!user) return;
    setDeletingId(channelId);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      await fetch(`${API_BASE_URL}/api/channels/${channelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      await deleteChannel(user.uid, channelId);
      toast.success("Channel disconnected");
      if (activeChannel?.channelId === channelId && channels.length > 1) {
        const next = channels.find(c => c.channelId !== channelId);
        if (next) setActiveChannelById(next.channelId);
      }
    } catch {
      toast.error("Failed to disconnect channel");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono flex items-center gap-2">
            <Tv2 className="h-5 w-5 text-primary" />
            MY CHANNELS
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            Manage multiple YouTube channels from one account
          </p>
        </div>
        <button
          onClick={handleConnectNew}
          disabled={connecting}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-mono hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
          Connect New Channel
        </button>
      </div>

      {/* Empty state */}
      {channels.length === 0 && (
        <div className="border border-dashed border-border rounded-lg p-12 text-center space-y-3">
          <Youtube className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm font-mono text-muted-foreground">No channels connected yet</p>
          <p className="text-xs text-muted-foreground">Click "Connect New Channel" to link your first YouTube channel</p>
        </div>
      )}

      {/* Channel cards */}
      <div className="grid gap-4">
        {channels.map(ch => {
          const isActive = ch.channelId === activeChannel?.channelId;
          const isDeleting = deletingId === ch.channelId;
          const isConfirming = confirmDeleteId === ch.channelId;

          return (
            <div
              key={ch.channelId}
              className={cn(
                "border rounded-lg p-4 flex items-center gap-4 transition-colors",
                isActive ? "border-primary/50 bg-primary/5" : "border-border bg-card"
              )}
            >
              {/* Thumbnail */}
              {ch.youtubeChannelThumbnail ? (
                <img src={ch.youtubeChannelThumbnail} className="h-12 w-12 rounded-full object-cover shrink-0" alt="" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Youtube className="h-5 w-5 text-muted-foreground" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono font-semibold truncate">
                    {ch.youtubeChannelTitle || ch.channelId}
                  </p>
                  {isActive && (
                    <span className="text-[9px] font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded shrink-0">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{ch.niche}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {ch.totalVideosPublished || 0} videos published
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {!isActive && (
                  <button
                    onClick={() => setActiveChannelById(ch.channelId)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-border rounded text-[10px] font-mono hover:bg-secondary transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Switch
                  </button>
                )}
                {isActive && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-primary">
                    <CheckCircle2 className="h-3 w-3" /> Selected
                  </span>
                )}

                {isConfirming ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-destructive">Sure?</span>
                    <button
                      onClick={() => handleDelete(ch.channelId)}
                      disabled={isDeleting}
                      className="px-2 py-1 bg-destructive text-destructive-foreground rounded text-[10px] font-mono hover:bg-destructive/90"
                    >
                      {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Yes'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-1 border border-border rounded text-[10px] font-mono hover:bg-secondary"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(ch.channelId)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"
                    title="Disconnect channel"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info box */}
      {channels.length > 0 && (
        <div className="flex items-start gap-2 text-blue-400 text-xs bg-blue-400/10 border border-blue-400/20 rounded-lg p-4 font-mono">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            The active channel is used across all pages — Dashboard, Pipeline, and video uploads.
            Switch channels using the selector in the bottom-left sidebar or the Switch button above.
          </p>
        </div>
      )}
    </div>
  );
}
