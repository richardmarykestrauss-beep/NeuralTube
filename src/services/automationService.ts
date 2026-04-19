import { scanForTrends, generateVideoScript, generateVisualsPrompt, generateSEOData } from "./geminiService";
import { db, auth } from "@/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { API_BASE_URL } from "../config/api";

export const runAutonomousScan = async (niche: string, authorUid: string) => {
  try {
    await addDoc(collection(db, "ai_logs"), {
      event: `Starting autonomous scan for niche: ${niche}`,
      type: "info",
      timestamp: serverTimestamp()
    });

    const trends = await scanForTrends(niche);

    for (const trend of trends) {
      const q = query(collection(db, "trends"), where("topic", "==", trend.topic));
      const existing = await getDocs(q);

      if (existing.empty) {
        await addDoc(collection(db, "trends"), {
          topic: trend.topic,
          score: trend.score || 50,
          volume: trend.volume || "Medium",
          competition: trend.competition || "Medium",
          potential: trend.potential || "Medium",
          status: trend.status || "rising",
          niche,
          velocity: `+${Math.floor(Math.random() * 500)}%`,
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, "ai_logs"), {
          event: `Identified new high-potential trend: ${trend.topic}`,
          type: "success",
          timestamp: serverTimestamp()
        });

        if (trend.status === "hot" && Math.random() > 0.7) {
          await addDoc(collection(db, "ai_logs"), {
            event: `Auto-initiating content pipeline for: ${trend.topic}`,
            type: "info",
            timestamp: serverTimestamp()
          });

          const videoDoc = await addDoc(collection(db, "videos"), {
            title: trend.topic,
            stage: "research",
            progress: 10,
            eta: "2h",
            authorUid,
            niche,
            createdAt: serverTimestamp()
          });

          processVideoPipeline(videoDoc.id, trend.topic, niche);
        }
      }
    }

    await addDoc(collection(db, "ai_logs"), {
      event: `Autonomous scan completed for ${niche}`,
      type: "success",
      timestamp: serverTimestamp()
    });

  } catch (error) {
    console.error("Autonomous scan failed:", error);
    await addDoc(collection(db, "ai_logs"), {
      event: `Autonomous scan failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      type: "error",
      timestamp: serverTimestamp()
    });
  }
};

const processVideoPipeline = async (videoId: string, title: string, niche: string, signal?: AbortSignal) => {
  const stages: ('research' | 'ideation' | 'scripting' | 'voiceover' | 'visuals' | 'thumbnail' | 'assembly' | 'seo' | 'review')[] =
    ['research', 'ideation', 'scripting', 'voiceover', 'visuals', 'thumbnail', 'assembly', 'seo', 'review'];

  let currentScript = "";
  let audioBase64: string | null = null;
  let visualKeywords: string[] = [];

  for (let i = 0; i < stages.length; i++) {
    if (signal?.aborted) {
      console.log(`Pipeline for ${title} aborted.`);
      return;
    }

    const stage = stages[i];

    await updateDoc(doc(db, "videos", videoId), {
      stage,
      progress: 25,
      updatedAt: serverTimestamp()
    });

    await addDoc(collection(db, "ai_logs"), {
      event: `Pipeline Update: "${title}" moved to ${stage.toUpperCase()}`,
      type: "info",
      timestamp: serverTimestamp()
    });

    try {
      if (stage === 'scripting') {
        const scriptData = await generateVideoScript(title, niche);
        currentScript = `${scriptData.hook}\n\n${scriptData.body}\n\n${scriptData.outro}`;
        await updateDoc(doc(db, "videos", videoId), {
          script: scriptData,
          progress: 100
        });

      } else if (stage === 'visuals') {
        const visuals = await generateVisualsPrompt(currentScript);
        // Extract keywords from visual prompts for video assembly
        if (Array.isArray(visuals)) {
          visualKeywords = visuals.slice(0, 5).map((v: any) =>
            typeof v === 'string' ? v.split(' ').slice(0, 3).join(' ') : (v.prompt || v.keyword || niche)
          );
        }
        await updateDoc(doc(db, "videos", videoId), {
          visuals,
          visualKeywords,
          progress: 100
        });

      } else if (stage === 'seo') {
        const seo = await generateSEOData(title, currentScript);
        await updateDoc(doc(db, "videos", videoId), {
          seo,
          progress: 100
        });

      } else if (stage === 'voiceover') {
        // Call TTS API — soft failure: pipeline continues even if TTS is unavailable
        try {
          const ttsResponse = await fetch(`${API_BASE_URL}/api/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: (currentScript || title).substring(0, 1000), voice: "en-US-Neural2-D" })
          });
          if (ttsResponse.ok) {
            const contentType = ttsResponse.headers.get('content-type') || '';
            if (contentType.includes('audio')) {
              // Got real audio — convert to base64 for video assembly
              const audioBuf = await ttsResponse.arrayBuffer();
              audioBase64 = Buffer.from(audioBuf).toString('base64');
              await updateDoc(doc(db, "videos", videoId), {
                voiceoverBase64: audioBase64,
                voiceoverUrl: null,
                progress: 100
              });
            } else {
              const ttsData = await ttsResponse.json();
              await updateDoc(doc(db, "videos", videoId), {
                voiceoverUrl: ttsData.url || null,
                voiceoverNote: ttsData.note || null,
                progress: 100
              });
            }
          } else {
            await updateDoc(doc(db, "videos", videoId), { voiceoverUrl: null, progress: 100 });
          }
        } catch (ttsErr) {
          await updateDoc(doc(db, "videos", videoId), { voiceoverUrl: null, progress: 100 });
          console.warn('TTS soft failure:', ttsErr);
        }

      } else if (stage === 'thumbnail') {
        try {
          const thumbResponse = await fetch(`${API_BASE_URL}/api/thumbnail`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, niche })
          });
          const thumbData = await thumbResponse.json();
          await updateDoc(doc(db, "videos", videoId), {
            thumbnailUrl: thumbData.url || `https://placehold.co/1280x720/FF4500/ffffff?text=${encodeURIComponent(title.substring(0, 30))}`,
            progress: 100
          });
        } catch (thumbErr) {
          await updateDoc(doc(db, "videos", videoId), {
            thumbnailUrl: `https://placehold.co/1280x720/FF4500/ffffff?text=${encodeURIComponent(title.substring(0, 30))}`,
            progress: 100
          });
          console.warn('Thumbnail soft failure:', thumbErr);
        }

      } else if (stage === 'assembly') {
        // ── Real video assembly via FFmpeg on the backend ──────────────────────
        try {
          await addDoc(collection(db, "ai_logs"), {
            event: `Assembling MP4 video for: "${title}"`,
            type: "info",
            timestamp: serverTimestamp()
          });

          const assembleResponse = await fetch(`${API_BASE_URL}/api/video/assemble`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              script: currentScript.substring(0, 500),
              audioBase64: audioBase64 || undefined,
              keywords: visualKeywords.length > 0 ? visualKeywords : [niche, title.split(' ').slice(0, 3).join(' ')],
              niche
            })
          });

          if (assembleResponse.ok) {
            const assembleData = await assembleResponse.json();
            if (assembleData.success && assembleData.videoBase64) {
              await updateDoc(doc(db, "videos", videoId), {
                videoBase64: assembleData.videoBase64,
                videoDurationSec: assembleData.durationSec,
                videoFileSizeBytes: assembleData.fileSizeBytes,
                videoAssembled: true,
                progress: 100
              });
              await addDoc(collection(db, "ai_logs"), {
                event: `MP4 assembled: ${assembleData.durationSec}s, ${Math.round((assembleData.fileSizeBytes || 0) / 1024 / 1024 * 10) / 10}MB`,
                type: "success",
                timestamp: serverTimestamp()
              });
            } else {
              throw new Error(assembleData.error || 'Assembly returned no video');
            }
          } else {
            const errData = await assembleResponse.json().catch(() => ({}));
            throw new Error(errData.error || `Assembly HTTP ${assembleResponse.status}`);
          }
        } catch (assembleErr: any) {
          // Soft failure — log but don't block pipeline
          console.warn('Video assembly soft failure:', assembleErr);
          await updateDoc(doc(db, "videos", videoId), {
            videoAssembled: false,
            videoAssemblyError: assembleErr.message,
            progress: 100
          });
          await addDoc(collection(db, "ai_logs"), {
            event: `Video assembly skipped: ${assembleErr.message}`,
            type: "warning",
            timestamp: serverTimestamp()
          });
        }

      } else {
        // Other stages (research, ideation, review) just mark as complete
        await updateDoc(doc(db, "videos", videoId), {
          progress: 100
        });
      }
    } catch (error) {
      console.error(`Error in stage ${stage}:`, error);
      await addDoc(collection(db, "ai_logs"), {
        event: `Error in ${stage} for "${title}": ${error instanceof Error ? error.message : "AI Error"}`,
        type: "error",
        timestamp: serverTimestamp()
      });
    }

    if (stage === 'review') {
      await addDoc(collection(db, "ai_logs"), {
        event: `Video "${title}" is ready for final review before publishing.`,
        type: "success",
        timestamp: serverTimestamp()
      });
      return;
    }

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, 8000);
      signal?.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Aborted'));
      }, { once: true });
    }).catch(err => {
      if (err.message !== 'Aborted') throw err;
    });
  }
};

export const publishVideo = async (videoId: string, title: string) => {
  try {
    await updateDoc(doc(db, "videos", videoId), {
      stage: 'publish',
      progress: 90,
      updatedAt: serverTimestamp()
    });

    await addDoc(collection(db, "ai_logs"), {
      event: `Finalizing publish for: ${title}`,
      type: "info",
      timestamp: serverTimestamp()
    });

    await simulateVideoUpload(videoId, title);
  } catch (error) {
    console.error("Publish failed:", error);
    toast.error("Failed to publish video");
  }
};

export const simulateVideoUpload = async (videoId: string, title: string) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();
    const tokens = userData?.youtubeTokens;

    if (!tokens) {
      await addDoc(collection(db, "ai_logs"), {
        event: `Upload failed: YouTube not connected for ${title}`,
        type: "error",
        timestamp: serverTimestamp()
      });
      toast.error("YouTube not connected. Please re-authenticate via the YouTube Channel page.");
      return;
    }

    await addDoc(collection(db, "ai_logs"), {
      event: `Initiating real upload to YouTube: ${title}`,
      type: "info",
      timestamp: serverTimestamp()
    });

    const videoDoc = await getDoc(doc(db, "videos", videoId));
    const videoData = videoDoc.data();

    const response = await fetch(`${API_BASE_URL}/api/youtube/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokens,
        title,
        description: videoData?.seo?.description || `Automated content generated by NeuralTube AI for ${title}.`,
        niche: videoData?.niche || userData?.niche || "General",
        videoBase64: videoData?.videoBase64 || undefined
      })
    });

    if (!response.ok) {
      throw new Error("YouTube API upload failed");
    }

    const result = await response.json();

    await updateDoc(doc(db, "videos", videoId), {
      stage: "publish",
      progress: 100,
      views: "0",
      revenue: "$0.00",
      youtubeVideoId: result.videoId || "pending",
      updatedAt: serverTimestamp()
    });

    if (result.channelTitle) {
      await updateDoc(doc(db, "users", user.uid), {
        youtubeChannelTitle: result.channelTitle,
        youtubeChannelId: result.channelId
      });
    }

    await addDoc(collection(db, "ai_logs"), {
      event: `Successfully uploaded to YouTube: ${title} (Channel: ${result.channelTitle})`,
      type: "success",
      timestamp: serverTimestamp()
    });

    toast.success(`Video "${title}" uploaded to YouTube!`);
  } catch (error) {
    console.error("Upload failed:", error);
    await addDoc(collection(db, "ai_logs"), {
      event: `Upload failed for ${title}: ${error instanceof Error ? error.message : "API Error"}`,
      type: "error",
      timestamp: serverTimestamp()
    });
    toast.error("Upload failed. Check logs for details.");
  }
};
