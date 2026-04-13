import { scanForTrends, generateVideoScript, generateVisualsPrompt, generateSEOData } from "./geminiService";
import { db, auth } from "@/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";

export const runAutonomousScan = async (niche: string, authorUid: string) => {
  try {
    // 1. Log start
    await addDoc(collection(db, "ai_logs"), {
      event: `Starting autonomous scan for niche: ${niche}`,
      type: "info",
      timestamp: serverTimestamp()
    });

    // 2. Scan for trends using Gemini
    const trends = await scanForTrends(niche);
    
    for (const trend of trends) {
      // Check if trend already exists
      const q = query(collection(db, "trends"), where("topic", "==", trend.topic));
      const existing = await getDocs(q);
      
      if (existing.empty) {
        await addDoc(collection(db, "trends"), {
          ...trend,
          niche,
          velocity: `+${Math.floor(Math.random() * 500)}%`,
          revenue: `$${(Math.random() * 5).toFixed(1)}K/day`,
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, "ai_logs"), {
          event: `Identified new high-potential trend: ${trend.topic}`,
          type: "success",
          timestamp: serverTimestamp()
        });

        // 3. If trend is "hot", automatically move to pipeline
        if (trend.status === "hot") {
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
            revenue: trend.revenue,
            createdAt: serverTimestamp()
          });

          // Start automated processing simulation
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
  const stages: ('research' | 'ideation' | 'scripting' | 'voiceover' | 'visuals' | 'thumbnail' | 'seo' | 'review' | 'publish')[] = 
    ['research', 'ideation', 'scripting', 'voiceover', 'visuals', 'thumbnail', 'seo', 'review'];
  
  let currentScript = "";

  for (let i = 0; i < stages.length; i++) {
    if (signal?.aborted) {
      console.log(`Pipeline for ${title} aborted.`);
      return;
    }

    const stage = stages[i];
    
    // Update stage and progress
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
        await updateDoc(doc(db, "videos", videoId), {
          visuals,
          progress: 100
        });
      } else if (stage === 'seo') {
        const seo = await generateSEOData(title, currentScript);
        await updateDoc(doc(db, "videos", videoId), {
          seo,
          progress: 100
        });
      } else if (stage === 'thumbnail') {
        // Simulate thumbnail generation
        await updateDoc(doc(db, "videos", videoId), {
          thumbnailUrl: `https://picsum.photos/seed/${encodeURIComponent(title)}/1280/720`,
          progress: 100
        });
      } else {
        // Other stages just simulate progress for now
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

    // If we reached review, stop and wait for manual publish
    if (stage === 'review') {
      await addDoc(collection(db, "ai_logs"), {
        event: `Video "${title}" is ready for final review before publishing.`,
        type: "success",
        timestamp: serverTimestamp()
      });
      return;
    }

    // Wait between stages to simulate work
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, 3000);
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
    // Move to publish stage
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

    // Simulate final upload
    await simulateVideoUpload(videoId, title);
  } catch (error) {
    console.error("Publish failed:", error);
    toast.error("Failed to publish video");
  }
};

export const simulateVideoUpload = async (videoId: string, title: string) => {
  try {
    // 1. Get user tokens from Firestore
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
      toast.error("YouTube not connected. Please connect in the sidebar.");
      return;
    }

    await addDoc(collection(db, "ai_logs"), {
      event: `Initiating real upload to YouTube: ${title}`,
      type: "info",
      timestamp: serverTimestamp()
    });

    // 2. Call our backend API to handle the YouTube upload
    const videoDoc = await getDoc(doc(db, "videos", videoId));
    const videoData = videoDoc.data();

    const response = await fetch("/api/youtube/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokens,
        title,
        description: videoData?.seo?.description || `Automated content generated by NeuralTube AI for ${title}.`,
        niche: videoData?.niche || userData?.niche || "General"
      })
    });

    if (!response.ok) {
      throw new Error("YouTube API upload failed");
    }

    const result = await response.json();

    // 3. Update Firestore on success
    await updateDoc(doc(db, "videos", videoId), {
      stage: "publish",
      progress: 100,
      views: "0",
      revenue: "$0.00",
      youtubeVideoId: result.videoId || "pending",
      updatedAt: serverTimestamp()
    });

    // Update channel title if it changed
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
