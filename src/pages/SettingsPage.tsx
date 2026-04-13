import { useState, useEffect } from "react";
import { useAuth } from "@/components/FirebaseProvider";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { toast } from "sonner";
import { Key, Save, Loader2 } from "lucide-react";

const SettingsPage = () => {
  const { profile, user } = useAuth();
  const [youtubeKey, setYoutubeKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.youtubeApiKey) {
      setYoutubeKey(profile.youtubeApiKey);
    }
  }, [profile]);

  const handleSaveYoutubeKey = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        youtubeApiKey: youtubeKey
      });
      toast.success("YouTube API Key updated successfully");
    } catch (error) {
      console.error("Failed to save YouTube API Key:", error);
      toast.error("Failed to update API Key");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">SETTINGS</h1>
        <p className="text-muted-foreground">Configure your AI Engine and external integrations.</p>
      </div>
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-bold font-mono text-primary uppercase flex items-center gap-2">
            <Key className="h-4 w-4" /> API CONFIGURATION
          </h3>
          
          <div className="grid gap-6">
            {/* YouTube Connection Status */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">YOUTUBE CONNECTION</label>
              <div className="flex items-center justify-between bg-secondary/30 border border-border rounded p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${profile?.youtubeConnected ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
                  <div>
                    <p className="text-sm font-bold font-mono uppercase">
                      {profile?.youtubeConnected ? "CONNECTED" : "DISCONNECTED"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {profile?.youtubeConnected ? `Linked to: ${profile.youtubeChannelTitle}` : "Connect via sidebar to enable uploads."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Gemini AI Engine Key (Managed via Environment) */}
            <div className="space-y-2 opacity-60">
              <label className="text-xs font-mono text-muted-foreground">GEMINI AI ENGINE KEY</label>
              <div className="flex gap-2">
                <input 
                  type="password" 
                  value="••••••••••••••••" 
                  readOnly 
                  className="flex-1 bg-secondary/20 border border-border rounded px-3 py-2 text-sm font-mono cursor-not-allowed"
                />
                <button 
                  disabled
                  className="px-4 py-2 bg-secondary rounded text-xs font-mono cursor-not-allowed"
                >
                  MANAGED
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                The core AI engine is managed by the platform environment.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border space-y-4">
          <h3 className="text-sm font-bold font-mono text-destructive uppercase">DANGER ZONE</h3>
          <button className="px-4 py-2 border border-destructive/50 text-destructive rounded text-xs font-mono hover:bg-destructive/10 transition-colors">
            WIPE ALL DATA
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
