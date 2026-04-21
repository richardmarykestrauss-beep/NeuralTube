import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { 
  FileText, Mic, Film, Image, Tags, Eye, 
  RefreshCw, Copy, Wand2, Volume2,
  CheckCircle2, AlertTriangle, Loader2, ArrowLeft, Upload,
  Trophy, BarChart2, FlipHorizontal, Scissors, DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateVideoScript } from "@/services/geminiService";
import { subscribeToVideos, Video, updateVideoStage } from "@/services/firestoreService";
import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/firebase";
import { API_BASE_URL } from "@/config/api";
import { toast } from "sonner";

type Tab = "script" | "voiceover" | "visuals" | "thumbnail" | "seo" | "review";

export const VideoDetailEditor = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("script");
  const [video, setVideo] = useState<Video | null>(null);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAB, setIsGeneratingAB] = useState(false);
  const [isGeneratingShort, setIsGeneratingShort] = useState(false);
  const [shortVideoUrl, setShortVideoUrl] = useState<string | null>(null);
  const [isEmbeddingAffiliate, setIsEmbeddingAffiliate] = useState(false);
  const [affiliateResult, setAffiliateResult] = useState<any>(null);

  // Subscribe to all videos, pick the one matching videoId (or first in queue)
  useEffect(() => {
    const unsub = subscribeToVideos((videos) => {
      setAllVideos(videos);
      if (videoId) {
        const found = videos.find(v => v.id === videoId);
        setVideo(found || null);
      } else {
        // Default to first video in pipeline
        setVideo(videos[0] || null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [videoId]);

  const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: "script", label: "SCRIPT", icon: FileText },
    { id: "voiceover", label: "VOICEOVER", icon: Mic },
    { id: "visuals", label: "VISUALS", icon: Film },
    { id: "thumbnail", label: "THUMBNAIL", icon: Image },
    { id: "seo", label: "SEO", icon: Tags },
    { id: "review", label: "REVIEW", icon: Eye },
  ];

  const handleRegenerate = async () => {
    if (!video) return;
    setIsRegenerating(true);
    try {
      const newScript = await generateVideoScript(video.title, video.niche || "Tech & AI");
      if (video.id) {
        await updateDoc(doc(db, "videos", video.id), {
          script: { hook: newScript.hook, body: newScript.body, outro: newScript.outro }
        });
        toast.success("Script regenerated");
      }
    } catch (error) {
      console.error("Failed to regenerate script:", error);
      toast.error("Failed to regenerate script");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleApproveAndSchedule = async () => {
    if (!video?.id) return;
    try {
      await updateVideoStage(video.id, "publish", 100);
      toast.success("Video approved and queued for publishing");
    } catch (err) {
      toast.error("Failed to approve video");
    }
  };

  const handleUploadNow = async () => {
    if (!video?.id || !video.videoBase64) {
      toast.error("No assembled video available — run the pipeline first");
      return;
    }
    setIsUploading(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/youtube/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoBase64: video.videoBase64,
          title: video.seo?.description ? video.title : video.title,
          description: video.seo?.description || "",
          tags: video.seo?.tags || [],
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Upload failed");
      await updateDoc(doc(db, "videos", video.id!), {
        youtubeVideoId: data.videoId,
        stage: "publish"
      });
      toast.success(`Uploaded! YouTube ID: ${data.videoId}`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm font-mono">Loading video data...</span>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">VIDEO EDITOR</h1>
        {allVideos.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Film className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm font-mono text-muted-foreground">No videos in pipeline yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Run a scan from the AI Engine to generate your first video.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Select a video to edit:</p>
            {allVideos.map(v => (
              <button
                key={v.id}
                onClick={() => navigate(`/video-editor/${v.id}`)}
                className="w-full text-left bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <p className="text-sm font-medium">{v.title}</p>
                <p className="text-xs font-mono text-muted-foreground mt-1">{v.stage?.toUpperCase()} — {v.niche}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const script = video.script;
  const seo = video.seo;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/pipeline")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1">
                {video.niche?.toUpperCase() || "GENERAL"} — {video.stage?.toUpperCase()}
              </p>
              <h2 className="text-lg font-bold">{video.title}</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xl font-mono font-bold text-success">{video.progress ?? 0}%</p>
              <p className="text-[9px] font-mono text-muted-foreground">PROGRESS</p>
            </div>
            {video.youtubeVideoId && (
              <div className="text-center">
                <p className="text-xs font-mono font-bold text-info">{video.youtubeVideoId}</p>
                <p className="text-[9px] font-mono text-muted-foreground">YT VIDEO ID</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono transition-all flex-1 justify-center",
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">

        {activeTab === "script" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            <div className="lg:col-span-2 p-6 border-r border-border relative">
              {isRegenerating && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs font-mono text-primary animate-pulse">AI ENGINE GENERATING SCRIPT...</p>
                  </div>
                </div>
              )}
              {script ? (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-trending/20 text-trending rounded">HOOK</span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90">{script.hook}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-info/20 text-info rounded">BODY</span>
                    <p className="text-sm leading-relaxed text-foreground/80 mt-2 whitespace-pre-line">{script.body}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-primary/20 text-primary rounded">CTA / OUTRO</span>
                    <p className="text-sm leading-relaxed text-foreground/80 mt-2">{script.outro}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-3">
                  <FileText className="h-8 w-8" />
                  <p className="text-sm font-mono">Script not yet generated</p>
                  <p className="text-xs text-muted-foreground">Current stage: {video.stage}</p>
                </div>
              )}
              <div className="flex items-center gap-2 mt-6">
                <button
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-xs font-mono text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <Wand2 className="h-3 w-3" /> {script ? "Regenerate" : "Generate Script"}
                </button>
                {script && (
                  <button
                    onClick={() => navigator.clipboard.writeText(`${script.hook}\n\n${script.body}\n\n${script.outro}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                )}
                {script && (
                  <button
                    onClick={async () => {
                      setIsEmbeddingAffiliate(true);
                      try {
                        // auth already statically imported
                        const user = auth.currentUser;
                        if (!user) throw new Error('Not signed in');
                        const idToken = await user.getIdToken();
                        const fullScript = `${script.hook}\n\n${script.body}\n\n${script.outro}`;
                        const res = await fetch(`${API_BASE_URL}/api/strategy/affiliate-embed`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                          body: JSON.stringify({ script: fullScript, niche: video.niche, title: video.title })
                        });
                        if (!res.ok) throw new Error('Affiliate embed failed');
                        const data = await res.json();
                        setAffiliateResult(data);
                        toast.success(`${data.insertions?.length || 0} affiliate mentions embedded!`);
                      } catch (err: any) {
                        toast.error(err.message || 'Affiliate embed failed');
                      } finally {
                        setIsEmbeddingAffiliate(false);
                      }
                    }}
                    disabled={isEmbeddingAffiliate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-yellow-600/20 border border-yellow-500/30 text-yellow-400 text-xs font-mono hover:bg-yellow-600/30 transition-colors disabled:opacity-50"
                  >
                    {isEmbeddingAffiliate ? <Loader2 className="h-3 w-3 animate-spin" /> : <DollarSign className="h-3 w-3" />}
                    {isEmbeddingAffiliate ? 'Embedding...' : 'Embed Affiliates'}
                  </button>
                )}
              </div>
              {affiliateResult && (
                <div className="mt-4 p-4 bg-yellow-900/10 border border-yellow-500/20 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-mono uppercase text-yellow-400">Affiliate Insertions</p>
                    <span className="text-[10px] font-mono text-muted-foreground">{affiliateResult.estimatedMonthlyRevenue}</span>
                  </div>
                  {(affiliateResult.insertions || []).map((ins: any, i: number) => (
                    <div key={i} className="bg-secondary/20 rounded p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-yellow-600/20 text-yellow-400 rounded uppercase">{ins.position}</span>
                        <span className="text-xs font-mono font-bold">{ins.product}</span>
                        <span className="text-[10px] text-muted-foreground">{ins.estimatedCommission}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-through">{ins.originalText}</p>
                      <p className="text-[11px] text-foreground/80">{ins.rewrittenText}</p>
                    </div>
                  ))}
                  {affiliateResult.rewrittenScript && (
                    <button
                      onClick={() => navigator.clipboard.writeText(affiliateResult.rewrittenScript)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-xs font-mono text-muted-foreground hover:text-foreground transition-colors w-full justify-center"
                    >
                      <Copy className="h-3 w-3" /> Copy Affiliate Script
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="p-4 space-y-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">VIDEO INFO</p>
              {[
                { label: "Stage", value: video.stage },
                { label: "Niche", value: video.niche || "—" },
                { label: "Progress", value: `${video.progress ?? 0}%` },
                { label: "Scheduled", value: video.scheduled || "—" },
                { label: "Views", value: video.views || "—" },
                { label: "Revenue", value: video.revenue || "—" },
                { label: "Video Assembled", value: video.videoAssembled ? "Yes" : "No" },
                { label: "YouTube ID", value: video.youtubeVideoId || "Not uploaded" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">{label}</span>
                  <span className="text-xs font-mono text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "voiceover" && (
          <div className="p-6 space-y-4">
            {video.voiceoverBase64 ? (
              <div className="space-y-4">
                <p className="text-[10px] font-mono uppercase text-muted-foreground">VOICEOVER — GENERATED</p>
                <div className="bg-secondary/30 rounded-md p-4 flex items-center gap-3">
                  <Volume2 className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm font-mono text-success">Voiceover ready</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Audio generated by TTS pipeline</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-3">
                <Mic className="h-8 w-8" />
                <p className="text-sm font-mono">Voiceover not yet generated</p>
                <p className="text-xs">Pipeline will generate it during the voiceover stage</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "visuals" && (
          <div className="p-6 space-y-4">
            <p className="text-[10px] font-mono uppercase text-muted-foreground">VISUAL KEYWORDS</p>
            {video.visualKeywords && video.visualKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {video.visualKeywords.map((kw, i) => (
                  <span key={i} className="text-xs font-mono bg-info/20 text-info px-2 py-1 rounded">{kw}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-mono">No visual keywords yet — generated during visuals stage</p>
            )}
            {video.videoAssembled && (
              <div className="bg-success/10 border border-success/30 rounded-lg p-4 mt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <p className="text-sm font-mono text-success">Video assembled successfully</p>
                </div>
                {video.videoDurationSec && (
                  <p className="text-xs text-muted-foreground mt-1">Duration: {video.videoDurationSec}s · Size: {video.videoFileSizeBytes ? `${(video.videoFileSizeBytes / 1024 / 1024).toFixed(1)}MB` : "—"}</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "thumbnail" && (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-mono uppercase text-muted-foreground">A/B THUMBNAIL TESTING</p>
              {video.thumbnailUrl && !video.thumbnailVariantA && (
                <button
                  onClick={async () => {
                    if (!video.id) return;
                    setIsGeneratingAB(true);
                    try {
                      // Generate variant A (original)
                      const varA = video.thumbnailUrl!;
                      // Generate variant B via backend with different style prompt
                      const resp = await fetch(`${API_BASE_URL}/api/thumbnail`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: video.title, style: 'bold_contrast', niche: video.niche })
                      });
                      const data = await resp.json();
                      const varB = data.thumbnailUrl || data.imageBase64 || varA;
                      await updateDoc(doc(db, 'videos', video.id), {
                        thumbnailVariantA: varA,
                        thumbnailVariantB: varB,
                        thumbnailCtrA: 0,
                        thumbnailCtrB: 0,
                        thumbnailWinner: null,
                        thumbnailAbStatus: 'testing'
                      });
                      toast.success('A/B variants generated — select winner after testing');
                    } catch (e) {
                      toast.error('Failed to generate variant B');
                    } finally {
                      setIsGeneratingAB(false);
                    }
                  }}
                  disabled={isGeneratingAB}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded text-xs font-mono hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {isGeneratingAB ? <Loader2 className="h-3 w-3 animate-spin" /> : <FlipHorizontal className="h-3 w-3" />}
                  Generate A/B Variants
                </button>
              )}
            </div>

            {/* A/B Testing Panel */}
            {video.thumbnailVariantA && video.thumbnailVariantB ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Variant A */}
                  <div className={cn(
                    "rounded-lg border-2 overflow-hidden transition-all",
                    video.thumbnailWinner === 'A' ? 'border-success' : 'border-border'
                  )}>
                    <div className="relative">
                      <img src={video.thumbnailVariantA} alt="Variant A" className="w-full aspect-video object-cover" />
                      {video.thumbnailWinner === 'A' && (
                        <div className="absolute top-2 right-2 bg-success text-success-foreground rounded-full p-1">
                          <Trophy className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold">VARIANT A</span>
                        <span className="text-xs font-mono text-muted-foreground">CTR: {video.thumbnailCtrA?.toFixed(1) ?? '0.0'}%</span>
                      </div>
                      <div className="w-full bg-secondary/30 rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (video.thumbnailCtrA || 0) * 10)}%` }} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={async () => {
                          if (!video.id) return;
                          await updateDoc(doc(db, 'videos', video.id), { thumbnailCtrA: (video.thumbnailCtrA || 0) + 0.5 });
                        }} className="flex-1 text-xs py-1 bg-secondary/30 rounded hover:bg-secondary/50 transition-colors">+0.5% CTR</button>
                        <button onClick={async () => {
                          if (!video.id) return;
                          await updateDoc(doc(db, 'videos', video.id), { thumbnailWinner: 'A', thumbnailUrl: video.thumbnailVariantA, thumbnailAbStatus: 'complete' });
                          toast.success('Variant A selected as winner');
                        }} className="flex-1 text-xs py-1 bg-success/20 text-success rounded hover:bg-success/30 transition-colors">Select Winner</button>
                      </div>
                    </div>
                  </div>

                  {/* Variant B */}
                  <div className={cn(
                    "rounded-lg border-2 overflow-hidden transition-all",
                    video.thumbnailWinner === 'B' ? 'border-success' : 'border-border'
                  )}>
                    <div className="relative">
                      <img src={video.thumbnailVariantB} alt="Variant B" className="w-full aspect-video object-cover" />
                      {video.thumbnailWinner === 'B' && (
                        <div className="absolute top-2 right-2 bg-success text-success-foreground rounded-full p-1">
                          <Trophy className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold">VARIANT B</span>
                        <span className="text-xs font-mono text-muted-foreground">CTR: {video.thumbnailCtrB?.toFixed(1) ?? '0.0'}%</span>
                      </div>
                      <div className="w-full bg-secondary/30 rounded-full h-1.5">
                        <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (video.thumbnailCtrB || 0) * 10)}%` }} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={async () => {
                          if (!video.id) return;
                          await updateDoc(doc(db, 'videos', video.id), { thumbnailCtrB: (video.thumbnailCtrB || 0) + 0.5 });
                        }} className="flex-1 text-xs py-1 bg-secondary/30 rounded hover:bg-secondary/50 transition-colors">+0.5% CTR</button>
                        <button onClick={async () => {
                          if (!video.id) return;
                          await updateDoc(doc(db, 'videos', video.id), { thumbnailWinner: 'B', thumbnailUrl: video.thumbnailVariantB, thumbnailAbStatus: 'complete' });
                          toast.success('Variant B selected as winner');
                        }} className="flex-1 text-xs py-1 bg-success/20 text-success rounded hover:bg-success/30 transition-colors">Select Winner</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* A/B Status */}
                <div className="flex items-center gap-2 text-xs font-mono">
                  <BarChart2 className="h-3.5 w-3.5 text-primary" />
                  <span className={cn(
                    video.thumbnailAbStatus === 'complete' ? 'text-success' : 'text-warning'
                  )}>
                    {video.thumbnailAbStatus === 'complete'
                      ? `Test complete — Variant ${video.thumbnailWinner} wins`
                      : 'Test in progress — track CTR from YouTube Studio'}
                  </span>
                </div>
              </div>
            ) : video.thumbnailUrl ? (
              <div className="space-y-3">
                <img src={video.thumbnailUrl} alt="Video thumbnail" className="rounded-lg border border-border max-w-sm object-cover aspect-video" />
                <p className="text-xs font-mono text-success flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Thumbnail ready — click "Generate A/B Variants" to start split testing
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-3">
                <Image className="h-8 w-8" />
                <p className="text-sm font-mono">Thumbnail not yet generated</p>
                <p className="text-xs">Pipeline generates it during the thumbnail stage</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "seo" && (
          <div className="p-6 space-y-4">
            {seo ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-mono uppercase text-muted-foreground mb-2">TITLE</p>
                    <div className="bg-secondary/30 rounded-md p-3">
                      <p className="text-sm font-medium">{video.title}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-1">{video.title.length}/100 characters</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase text-muted-foreground mb-2">DESCRIPTION</p>
                    <div className="bg-secondary/30 rounded-md p-3">
                      <p className="text-xs text-foreground/80">{seo.description}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-muted-foreground mb-2">TAGS ({seo.tags.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {seo.tags.map(tag => (
                      <span key={tag} className="text-xs font-mono bg-secondary px-2 py-1 rounded text-foreground/80">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-3">
                <Tags className="h-8 w-8" />
                <p className="text-sm font-mono">SEO data not yet generated</p>
                <p className="text-xs">Pipeline generates it during the SEO stage</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "review" && (
          <div className="p-6 space-y-4">
            <p className="text-[10px] font-mono uppercase text-muted-foreground">FINAL REVIEW — QUALITY ASSURANCE</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { check: "Script", status: script ? "passed" : "pending", detail: script ? "Script ready" : "Not yet generated" },
                { check: "Voiceover", status: video.voiceoverBase64 ? "passed" : "pending", detail: video.voiceoverBase64 ? "Audio ready" : "Not yet generated" },
                { check: "Video Assembly", status: video.videoAssembled ? "passed" : "pending", detail: video.videoAssembled ? `${video.videoDurationSec}s MP4` : "Not yet assembled" },
                { check: "Thumbnail", status: video.thumbnailUrl ? "passed" : "pending", detail: video.thumbnailUrl ? "Thumbnail ready" : "Not yet generated" },
                { check: "SEO", status: seo ? "passed" : "pending", detail: seo ? `${seo.tags.length} tags` : "Not yet generated" },
                { check: "YouTube Upload", status: video.youtubeVideoId ? "passed" : "pending", detail: video.youtubeVideoId ? `ID: ${video.youtubeVideoId}` : "Not uploaded" },
                { check: "Stage", status: video.stage === "error" ? "warning" : "passed", detail: video.stage?.toUpperCase() || "—" },
                { check: "Pipeline", status: (video.progress ?? 0) >= 100 ? "passed" : "pending", detail: `${video.progress ?? 0}% complete` },
              ].map((item, i) => (
                <div key={i} className={cn(
                  "bg-secondary/30 rounded-lg p-3 border",
                  item.status === "passed" ? "border-success/20" :
                  item.status === "warning" ? "border-warning/20" : "border-border"
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    {item.status === "passed" ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> :
                     item.status === "warning" ? <AlertTriangle className="h-3.5 w-3.5 text-warning" /> :
                     <Loader2 className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="text-xs font-mono font-bold">{item.check}</span>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleApproveAndSchedule}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-success text-success-foreground text-sm font-mono font-bold flex-1 justify-center hover:bg-success/90 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" /> APPROVE & SCHEDULE PUBLISH
              </button>
              {video.videoBase64 && !video.youtubeVideoId && (
                <button
                  onClick={handleUploadNow}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-mono font-bold justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {isUploading ? "UPLOADING..." : "UPLOAD TO YOUTUBE"}
                </button>
              )}
              {video.script && !shortVideoUrl && (
                <button
                  onClick={async () => {
                    setIsGeneratingShort(true);
                    try {
                      // auth already statically imported
                      const user = auth.currentUser;
                      if (!user) throw new Error('Not signed in');
                      const idToken = await user.getIdToken();
                      const shortsRes = await fetch(`${API_BASE_URL}/api/strategy/shorts`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                        body: JSON.stringify({ script: video.script, title: video.title, niche: video.niche })
                      });
                      const shortsData = await shortsRes.json();
                      const firstShort = shortsData?.shorts?.[0];
                      if (!firstShort) throw new Error('No Short script generated');
                      const assembleRes = await fetch(`${API_BASE_URL}/api/video/assemble-short`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                        body: JSON.stringify({ shortsScript: firstShort.shortsScript, title: firstShort.title || video.title, niche: video.niche, videoId: video.id })
                      });
                      const assembleData = await assembleRes.json();
                      if (!assembleData.success) throw new Error(assembleData.error || 'Short assembly failed');
                      const url = assembleData.videoUrl || assembleData.videoBase64;
                      setShortVideoUrl(url);
                      if (video.id) {
                        await updateDoc(doc(db, 'videos', video.id), { shortVideoUrl: assembleData.videoUrl || null, shortGeneratedAt: new Date() });
                      }
                      toast.success('YouTube Short generated! 9:16 vertical format ready.');
                    } catch (err: any) {
                      toast.error(err.message || 'Short generation failed');
                    } finally {
                      setIsGeneratingShort(false);
                    }
                  }}
                  disabled={isGeneratingShort}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400 text-sm font-mono font-bold justify-center hover:bg-purple-600/30 transition-colors disabled:opacity-50"
                >
                  {isGeneratingShort ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
                  {isGeneratingShort ? 'GENERATING SHORT...' : 'GENERATE SHORT'}
                </button>
              )}
              {shortVideoUrl && (
                <a
                  href={shortVideoUrl.startsWith('http') ? shortVideoUrl : `data:video/mp4;base64,${shortVideoUrl}`}
                  download={`${video.title || 'short'}_vertical.mp4`}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-600/20 border border-green-500/30 text-green-400 text-sm font-mono font-bold justify-center hover:bg-green-600/30 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" /> DOWNLOAD SHORT (9:16)
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
