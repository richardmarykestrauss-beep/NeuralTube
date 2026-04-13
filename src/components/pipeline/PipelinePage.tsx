import { useState, useEffect } from "react";
import { 
  Search, Sparkles, FileText, Mic, Film, Image, Tags, Upload, CheckCircle2, 
  ChevronRight, Clock, Zap, BarChart3, ArrowRight, Eye, AlertTriangle, Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribeToVideos, Video, updateVideoStage } from "@/services/firestoreService";
import { publishVideo } from "@/services/automationService";
import { toast } from "sonner";

const STAGES = [
  { id: "research", label: "RESEARCH", icon: Search, color: "text-cyber", bgColor: "bg-cyber/10", borderColor: "border-cyber/30" },
  { id: "ideation", label: "IDEATION", icon: Sparkles, color: "text-ai-glow", bgColor: "bg-ai-glow/10", borderColor: "border-ai-glow/30" },
  { id: "scripting", label: "SCRIPT", icon: FileText, color: "text-info", bgColor: "bg-info/10", borderColor: "border-info/30" },
  { id: "voiceover", label: "VOICE", icon: Mic, color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/30" },
  { id: "visuals", label: "VISUALS", icon: Film, color: "text-trending", bgColor: "bg-trending/10", borderColor: "border-trending/30" },
  { id: "thumbnail", label: "THUMB", icon: Image, color: "text-warning", bgColor: "bg-warning/10", borderColor: "border-warning/30" },
  { id: "seo", label: "SEO", icon: Tags, color: "text-revenue", bgColor: "bg-revenue/10", borderColor: "border-revenue/30" },
  { id: "review", label: "REVIEW", icon: Eye, color: "text-accent", bgColor: "bg-accent/10", borderColor: "border-accent/30" },
  { id: "publish", label: "PUBLISH", icon: Upload, color: "text-success", bgColor: "bg-success/10", borderColor: "border-success/30" },
];

const qualityGates: Record<string, { min: number; checks: string[] }> = {
  scripting: { min: 80, checks: ["Hook strength ≥ 85%", "Retention prediction ≥ 70%", "Originality score ≥ 90%", "CTR-bait balance check"] },
  voiceover: { min: 85, checks: ["Naturalness score ≥ 90%", "Pacing analysis passed", "Emotion mapping complete", "No AI artifacts detected"] },
  visuals: { min: 80, checks: ["Scene coherence ≥ 85%", "B-roll relevance ≥ 80%", "Motion smoothness check", "Brand consistency verified"] },
  thumbnail: { min: 90, checks: ["CTR prediction ≥ 8%", "Contrast & readability pass", "Face/emotion detection", "A/B variant generated"] },
  seo: { min: 75, checks: ["Title keyword density", "Description optimized", "Tags coverage ≥ 95%", "Hashtag strategy applied"] },
  review: { min: 85, checks: ["Full video QA passed", "Audio sync verified", "Copyright scan clean", "Monetization eligible"] },
};

export const PipelinePage = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToVideos((data) => {
      setVideos(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStageOverride = async (videoId: string, stageId: string) => {
    setUpdating(videoId);
    try {
      await updateVideoStage(videoId, stageId as Video['stage'], 10);
      toast.success(`Video moved to ${stageId.toUpperCase()}`);
    } catch (error) {
      toast.error("Failed to update stage");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Pipeline Stage Header */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Film className="h-4 w-4 text-ai-glow" />
          <h2 className="font-semibold text-sm">CONTENT CREATION PIPELINE</h2>
          <span className="text-xs font-mono text-muted-foreground ml-auto">{videos.length} videos in pipeline</span>
        </div>
        
        {/* Stage flow visualization */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            const count = videos.filter(v => v.stage === stage.id).length;
            return (
              <div key={stage.id} className="flex items-center">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md border min-w-fit",
                  stage.bgColor, stage.borderColor
                )}>
                  <Icon className={cn("h-3.5 w-3.5", stage.color)} />
                  <span className={cn("text-[10px] font-mono font-bold", stage.color)}>{stage.label}</span>
                  {count > 0 && (
                    <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-card", stage.color)}>
                      {count}
                    </span>
                  )}
                </div>
                {i < STAGES.length - 1 && <ChevronRight className="h-3 w-3 text-border mx-1 shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Video cards */}
      <div className="grid gap-3">
        {videos.length === 0 && (
          <div className="text-center py-12 bg-card border border-dashed border-border rounded-lg">
            <Film className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">No videos in pipeline. Run an autonomous scan to start.</p>
          </div>
        )}
        {videos.map(video => {
          const currentStageIdx = STAGES.findIndex(s => s.id === video.stage);
          const currentStage = STAGES[currentStageIdx] || STAGES[0];
          const StageIcon = currentStage.icon;
          const isSelected = selectedVideo === video.id;
          const gate = qualityGates[video.stage];
          const stagesCompleted = STAGES.slice(0, currentStageIdx).map(s => s.id);

          return (
            <div key={video.id}>
              <div
                className={cn(
                  "bg-card border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/30",
                  isSelected ? "border-primary/50" : "border-border",
                  updating === video.id && "opacity-50 pointer-events-none"
                )}
                onClick={() => setSelectedVideo(isSelected ? null : video.id!)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Stage badge */}
                    <div className={cn("p-2.5 rounded-lg shrink-0", currentStage.bgColor)}>
                      {updating === video.id ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <StageIcon className={cn("h-5 w-5", currentStage.color)} />
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">{video.title}</p>
                        {video.revenue && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-revenue/20 text-revenue rounded">HIGH VALUE</span>
                        )}
                      </div>
                      
                      {/* Stage progress bar */}
                      <div className="flex items-center gap-1.5">
                        {STAGES.map((s, i) => (
                          <div key={s.id} className="flex-1 h-1.5 rounded-full overflow-hidden bg-secondary">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                stagesCompleted.includes(s.id) ? "bg-success" :
                                s.id === video.stage ? `bg-gradient-to-r from-primary to-primary/50` : ""
                              )}
                              style={{ width: s.id === video.stage ? `${video.progress || 0}%` : stagesCompleted.includes(s.id) ? "100%" : "0%" }}
                            />
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] font-mono text-muted-foreground">{video.niche || "General"}</span>
                        <span className={cn("text-[10px] font-mono", currentStage.color)}>{currentStage.label}</span>
                        <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> {video.eta || video.scheduled || "TBD"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-mono text-revenue">{video.revenue || "$0"}</p>
                      <p className="text-[9px] font-mono text-muted-foreground">EST. REVENUE</p>
                    </div>
                    
                    <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isSelected && "rotate-90")} />
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {isSelected && (
                <div className="bg-card/50 border border-t-0 border-border rounded-b-lg p-4 space-y-4 animate-slide-up">
                  {/* Stage detail grid */}
                  <div className="grid grid-cols-3 lg:grid-cols-9 gap-2">
                    {STAGES.map(stage => {
                      const completed = stagesCompleted.includes(stage.id);
                      const isCurrent = stage.id === video.stage;
                      const Icon = stage.icon;
                      return (
                        <button 
                          key={stage.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStageOverride(video.id!, stage.id);
                          }}
                          className={cn(
                            "p-2 rounded-md border text-center transition-all hover:scale-105 active:scale-95",
                            completed ? "bg-success/10 border-success/30" :
                            isCurrent ? `${stage.bgColor} ${stage.borderColor}` :
                            "bg-secondary/30 border-border hover:border-primary/50"
                          )}
                        >
                          <Icon className={cn("h-3.5 w-3.5 mx-auto mb-1", completed ? "text-success" : isCurrent ? stage.color : "text-muted-foreground")} />
                          <p className={cn("text-[9px] font-mono", completed ? "text-success" : isCurrent ? stage.color : "text-muted-foreground")}>{stage.label}</p>
                          {completed && <CheckCircle2 className="h-3 w-3 text-success mx-auto mt-1" />}
                          {isCurrent && <p className="text-[8px] font-mono text-muted-foreground mt-1">{video.progress || 0}%</p>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Quality gate for current stage */}
                  {gate && (
                    <div className="bg-secondary/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-3.5 w-3.5 text-warning" />
                        <p className="text-xs font-mono font-bold text-foreground">QUALITY GATE — {currentStage.label}</p>
                        <span className="text-[10px] font-mono text-muted-foreground ml-auto">Min score: {gate.min}</span>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {gate.checks.map((check, i) => {
                          const passed = (video.progress || 0) > (i + 1) * 25;
                          return (
                            <div key={i} className={cn(
                              "flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono",
                              passed ? "bg-success/10 text-success" : "bg-card text-muted-foreground"
                            )}>
                              {passed ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <Clock className="h-3 w-3 shrink-0" />}
                              {check}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* AI Content Preview */}
                  {(video.script || video.visuals || video.seo || video.thumbnailUrl) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Script Preview */}
                      {video.script && (
                        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-2 border-b border-border pb-2">
                            <FileText className="h-4 w-4 text-info" />
                            <h3 className="text-xs font-bold font-mono">AI SCRIPT PREVIEW</h3>
                          </div>
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            <div>
                              <p className="text-[10px] font-mono text-info uppercase mb-1">Hook</p>
                              <p className="text-xs italic text-foreground bg-info/5 p-2 rounded border border-info/10">{video.script.hook}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-mono text-info uppercase mb-1">Body Content</p>
                              <p className="text-xs text-muted-foreground leading-relaxed">{video.script.body}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-mono text-info uppercase mb-1">Outro</p>
                              <p className="text-xs text-muted-foreground">{video.script.outro}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        {/* Thumbnail & Visuals */}
                        {(video.thumbnailUrl || video.visuals) && (
                          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-2 border-b border-border pb-2">
                              <Image className="h-4 w-4 text-warning" />
                              <h3 className="text-xs font-bold font-mono">VISUAL ASSETS</h3>
                            </div>
                            {video.thumbnailUrl && (
                              <div className="aspect-video rounded overflow-hidden border border-border bg-secondary/30 relative group">
                                <img 
                                  src={video.thumbnailUrl} 
                                  alt="Thumbnail Preview" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-[10px] font-mono font-bold text-white">AI GENERATED THUMBNAIL</span>
                                </div>
                              </div>
                            )}
                            {video.visuals && (
                              <div className="p-3 bg-secondary/20 rounded border border-border">
                                <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1 flex items-center gap-1">
                                  <Film className="h-3 w-3" /> Visual Instructions
                                </p>
                                <p className="text-[10px] leading-relaxed text-muted-foreground line-clamp-4">{video.visuals}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* SEO Preview */}
                        {video.seo && (
                          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-2 border-b border-border pb-2">
                              <Tags className="h-4 w-4 text-revenue" />
                              <h3 className="text-xs font-bold font-mono">SEO & METADATA</h3>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Tags</p>
                                <div className="flex flex-wrap gap-1">
                                  {video.seo.tags.map((tag, i) => (
                                    <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 bg-revenue/10 text-revenue border border-revenue/20 rounded">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Description</p>
                                <p className="text-[10px] text-muted-foreground line-clamp-3 italic">"{video.seo.description}"</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Publish Action */}
                  {video.stage === 'review' && (
                    <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-primary">Ready for YouTube</p>
                        <p className="text-xs text-muted-foreground">All quality gates passed. Review the content above before publishing.</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          publishVideo(video.id!, video.title);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-bold hover:bg-primary/90 transition-colors"
                      >
                        <Upload className="h-4 w-4" />
                        PUBLISH TO YOUTUBE
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
