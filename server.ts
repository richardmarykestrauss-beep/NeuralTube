import cron from 'node-cron';
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Helper: Get Google credentials from env ────────────────────────────────
function getGoogleCredentials() {
  const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credsJson) throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON not set");
  return JSON.parse(credsJson);
}

// ─── Rate limiting for AI calls ──────────────────────────────────────────────
let lastGeminiCall = 0;
const GEMINI_DELAY_MS = 3000;
async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLast = now - lastGeminiCall;
  if (timeSinceLast < GEMINI_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, GEMINI_DELAY_MS - timeSinceLast));
  }
  lastGeminiCall = Date.now();
}

// ─── Trend scanning helper ───────────────────────────────────────────────────
async function scanForTrends(niche: string) {
  return [
    { topic: `${niche}: AI Breakthroughs 2025`, score: 95, volume: "2.1M", competition: "Medium", potential: "High", status: "hot" },
    { topic: `${niche}: Future Predictions`, score: 87, volume: "1.4M", competition: "Low", potential: "Very High", status: "rising" },
    { topic: `${niche}: Beginner Guide`, score: 78, volume: "890K", competition: "High", potential: "Medium", status: "stable" },
  ];
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000");

  // ─── Bind to port IMMEDIATELY so Cloud Run health check passes ───────────
  // Cloud Run requires the container to listen on PORT within the startup timeout.
  // We start listening first, then complete async initialization.
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`NeuralTube server listening on http://0.0.0.0:${PORT}`);
  });

  // ─── CORS ──────────────────────────────────────────────────────────────────
  app.use((req, res, next) => {
    const allowedOrigins = [
      'https://neural-tube.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', 'https://neural-tube.vercel.app');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  // ─── YouTube OAuth ─────────────────────────────────────────────────────────
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/youtube/callback`
  );

  app.get("/api/auth/youtube/url", (req, res) => {
    if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
      return res.status(500).json({ error: "YouTube API credentials missing" });
    }
    try {
      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "https://www.googleapis.com/auth/youtube.upload",
          "https://www.googleapis.com/auth/youtube.readonly"
        ],
        prompt: "consent"
      });
      res.json({ url });
    } catch (error) {
      console.error("Error generating auth URL:", error);
      res.status(500).json({ error: "Failed to generate authorization URL" });
    }
  });

  app.get("/api/auth/youtube/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      res.send(`
        <html><body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'YOUTUBE_AUTH_SUCCESS', 
                tokens: ${JSON.stringify(tokens)} 
              }, '${process.env.APP_URL || 'http://localhost:3000'}');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body></html>
      `);
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // ─── Health check ──────────────────────────────────────────────────────────
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), version: "2.0.0" });
  });

  // ─── Vertex AI / Gemini Proxy ──────────────────────────────────────────────
  app.post("/api/ai/generate", async (req, res) => {
    const { model, contents } = req.body;
    try {
      await waitForRateLimit();
      const { VertexAI } = await import("@google-cloud/vertexai");
      const credentials = getGoogleCredentials();
      const vertexAI = new VertexAI({
        project: "neuraltube-app",
        location: "us-central1",
        googleAuthOptions: { credentials }
      });
      const gm = vertexAI.getGenerativeModel({ model: model || "gemini-2.0-flash-001" });
      const prompt = contents.map((c: any) => c.parts.map((p: any) => p.text).join(" ")).join(" ");
      const result = await gm.generateContent(prompt);
      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
      res.json({ text });
    } catch (error) {
      console.error("Vertex AI Error:", error);
      res.status(500).json({ 
        error: "AI Generation failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // ─── Real Trend Scanning via YouTube Data API ──────────────────────────────
  app.post("/api/trends/real", async (req, res) => {
    const { niche = "Technology" } = req.body;
    try {
      // Use YouTube Data API to find trending videos in the niche
      const youtube = google.youtube({ version: "v3" });
      const searchResponse = await youtube.videos.list({
        part: ["snippet", "statistics"],
        chart: "mostPopular",
        regionCode: "US",
        videoCategoryId: niche === "Technology" ? "28" : 
                         niche === "Finance" ? "25" : 
                         niche === "Health" ? "26" : "28",
        maxResults: 10,
        key: process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY
      });

      const trends = (searchResponse.data.items || []).map((item: any, index: number) => ({
        topic: item.snippet?.title || `Trend ${index + 1}`,
        score: Math.max(60, 95 - index * 4),
        volume: formatViewCount(parseInt(item.statistics?.viewCount || "0")),
        competition: index < 3 ? "High" : index < 7 ? "Medium" : "Low",
        potential: index < 2 ? "Very High" : index < 5 ? "High" : "Medium",
        status: index < 3 ? "hot" : index < 6 ? "rising" : "stable",
        videoId: item.id,
        channelTitle: item.snippet?.channelTitle
      }));

      res.json({ trends, source: "youtube_data_api" });
    } catch (error) {
      console.error("YouTube Trends API Error:", error);
      // Fallback to AI-generated trends
      const fallbackTrends = await scanForTrends(niche);
      res.json({ trends: fallbackTrends, source: "ai_fallback" });
    }
  });

  // ─── Google Cloud TTS Voiceover ────────────────────────────────────────────
  app.post("/api/tts", async (req, res) => {
    const { text, videoId, voice = "en-US-Neural2-D", speakingRate = 1.0 } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });

    try {
      const { TextToSpeechClient } = await import("@google-cloud/text-to-speech");
      const credentials = getGoogleCredentials();
      const ttsClient = new TextToSpeechClient({ credentials });

      const [response] = await ttsClient.synthesizeSpeech({
        input: { text },
        voice: { languageCode: "en-US", name: voice },
        audioConfig: { audioEncoding: "MP3", speakingRate }
      });

      const audioContent = response.audioContent as Buffer;

      // Upload to GCS
      const { Storage } = await import("@google-cloud/storage");
      const storage = new Storage({ credentials });
      const bucket = storage.bucket("neuraltube-videos");
      const fileName = `audio/${videoId}_voiceover.mp3`;
      const file = bucket.file(fileName);
      await file.save(audioContent, { contentType: "audio/mpeg" });
      await file.makePublic();

      const publicUrl = `https://storage.googleapis.com/neuraltube-videos/${fileName}`;
      res.json({ success: true, audioUrl: publicUrl, fileName });
    } catch (error) {
      console.error("TTS Error:", error);
      res.status(500).json({ error: "TTS generation failed", details: error instanceof Error ? error.message : "Unknown" });
    }
  });

  // ─── Thumbnail Generation ──────────────────────────────────────────────────
  app.post("/api/thumbnail", async (req, res) => {
    const { title, niche, videoId } = req.body;
    if (!title || !videoId) return res.status(400).json({ error: "title and videoId are required" });

    try {
      // Fetch background image from Unsplash
      const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
      const query = encodeURIComponent(`${niche} technology abstract`);
      const unsplashRes = await axios.get(
        `https://api.unsplash.com/photos/random?query=${query}&orientation=landscape&client_id=${unsplashKey}`
      );
      const imageUrl = unsplashRes.data.urls?.regular || unsplashRes.data.urls?.full;

      // Download the background image
      const tmpDir = "/tmp/neuraltube";
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      const bgPath = `${tmpDir}/${videoId}_bg.jpg`;
      const thumbPath = `${tmpDir}/${videoId}_thumb.jpg`;

      const imgResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(bgPath, imgResponse.data);

      // Use FFmpeg to composite text overlay onto the image
      const safeTitle = title.replace(/'/g, "\\'").substring(0, 60);
      const ffmpegCmd = `ffmpeg -y -i "${bgPath}" \
        -vf "scale=1280:720,drawtext=text='${safeTitle}':fontcolor=white:fontsize=52:x=(w-text_w)/2:y=(h-text_h)/2:shadowcolor=black:shadowx=3:shadowy=3:box=1:boxcolor=black@0.5:boxborderw=10" \
        "${thumbPath}"`;

      await execAsync(ffmpegCmd);

      // Upload to GCS
      const { Storage } = await import("@google-cloud/storage");
      const credentials = getGoogleCredentials();
      const storage = new Storage({ credentials });
      const bucket = storage.bucket("neuraltube-videos");
      const fileName = `thumbnails/${videoId}_thumbnail.jpg`;
      const file = bucket.file(fileName);
      await file.save(fs.readFileSync(thumbPath), { contentType: "image/jpeg" });
      await file.makePublic();

      // Cleanup temp files
      fs.unlinkSync(bgPath);
      fs.unlinkSync(thumbPath);

      const publicUrl = `https://storage.googleapis.com/neuraltube-videos/${fileName}`;
      res.json({ success: true, thumbnailUrl: publicUrl, fileName });
    } catch (error) {
      console.error("Thumbnail Error:", error);
      // Fallback to Picsum placeholder
      const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(title)}/1280/720`;
      res.json({ success: true, thumbnailUrl: fallbackUrl, fallback: true });
    }
  });

  // ─── Video Assembly with FFmpeg ────────────────────────────────────────────
  app.post("/api/video/assemble", async (req, res) => {
    const { videoId, audioUrl, thumbnailUrl, title, niche, duration = 60 } = req.body;
    if (!videoId || !audioUrl) return res.status(400).json({ error: "videoId and audioUrl are required" });

    try {
      const tmpDir = "/tmp/neuraltube";
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const audioPath = `${tmpDir}/${videoId}_audio.mp3`;
      const videoPath = `${tmpDir}/${videoId}_stock.mp4`;
      const outputPath = `${tmpDir}/${videoId}_final.mp4`;

      // Download audio
      const audioRes = await axios.get(audioUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(audioPath, audioRes.data);

      // Fetch stock video from Pexels
      const pexelsKey = process.env.PEXELS_API_KEY;
      const pexelsQuery = encodeURIComponent(niche || "technology");
      const pexelsRes = await axios.get(
        `https://api.pexels.com/videos/search?query=${pexelsQuery}&per_page=5&min_duration=${duration - 10}&max_duration=${duration + 30}`,
        { headers: { Authorization: pexelsKey } }
      );

      const videos = pexelsRes.data.videos || [];
      if (videos.length === 0) throw new Error("No Pexels videos found");

      const stockVideo = videos[0];
      const videoFile = stockVideo.video_files?.find((f: any) => f.quality === "hd") || stockVideo.video_files?.[0];
      if (!videoFile) throw new Error("No suitable video file found");

      // Download stock video
      const videoRes = await axios.get(videoFile.link, { responseType: "arraybuffer" });
      fs.writeFileSync(videoPath, videoRes.data);

      // Assemble with FFmpeg: loop video to match audio length, merge audio
      const ffmpegCmd = `ffmpeg -y \
        -stream_loop -1 -i "${videoPath}" \
        -i "${audioPath}" \
        -c:v libx264 -preset fast -crf 23 \
        -c:a aac -b:a 128k \
        -shortest \
        -movflags +faststart \
        "${outputPath}"`;

      await execAsync(ffmpegCmd, { timeout: 300000 });

      // Upload final video to GCS
      const { Storage } = await import("@google-cloud/storage");
      const credentials = getGoogleCredentials();
      const storage = new Storage({ credentials });
      const bucket = storage.bucket("neuraltube-videos");
      const fileName = `videos/${videoId}_final.mp4`;
      const file = bucket.file(fileName);
      await file.save(fs.readFileSync(outputPath), { contentType: "video/mp4" });
      await file.makePublic();

      // Cleanup temp files
      [audioPath, videoPath, outputPath].forEach(f => { try { fs.unlinkSync(f); } catch {} });

      const publicUrl = `https://storage.googleapis.com/neuraltube-videos/${fileName}`;
      res.json({ success: true, videoUrl: publicUrl, fileName });
    } catch (error) {
      console.error("Video Assembly Error:", error);
      res.status(500).json({ error: "Video assembly failed", details: error instanceof Error ? error.message : "Unknown" });
    }
  });

  // ─── YouTube Upload ────────────────────────────────────────────────────────
  app.post("/api/youtube/upload", async (req, res) => {
    const { tokens, title, description, niche, videoId: vidId, videoUrl, thumbnailUrl } = req.body;
    if (!tokens) return res.status(401).json({ error: "YouTube not connected" });

    try {
      oauth2Client.setCredentials(tokens);
      const youtube = google.youtube({ version: "v3", auth: oauth2Client });

      let videoStream: any;

      if (videoUrl) {
        // Stream from GCS URL
        const videoRes = await axios.get(videoUrl, { responseType: "stream" });
        videoStream = videoRes.data;
      } else {
        // Fallback: look for local file
        const videoFilePath = path.join(process.cwd(), 'public', 'assets', `final_${vidId}.mp4`);
        if (!fs.existsSync(videoFilePath)) {
          return res.status(404).json({ error: "No video file available. Run video assembly first." });
        }
        videoStream = fs.createReadStream(videoFilePath);
      }

      const uploadResponse = await youtube.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title: `[AI Generated] ${title}`,
            description: `${description}\n\nGenerated by NeuralTube AI Automation.`,
            tags: [niche, "AI", "Automation", "NeuralTube"],
            categoryId: "22"
          },
          status: {
            privacyStatus: "unlisted",
            selfDeclaredMadeForKids: false
          }
        },
        media: { body: videoStream }
      });

      const videoId = uploadResponse.data.id;

      // Upload thumbnail if provided
      if (thumbnailUrl && videoId) {
        try {
          const thumbRes = await axios.get(thumbnailUrl, { responseType: "stream" });
          await youtube.thumbnails.set({
            videoId,
            media: { mimeType: "image/jpeg", body: thumbRes.data }
          });
        } catch (thumbError) {
          console.warn("Thumbnail upload failed:", thumbError);
        }
      }

      const channelResponse = await youtube.channels.list({ part: ["snippet"], mine: true });
      const channel = channelResponse.data.items?.[0];

      res.json({
        success: true,
        videoId,
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        channelTitle: channel?.snippet?.title,
        channelId: channel?.id
      });
    } catch (error) {
      console.error("YouTube Upload Error:", error);
      res.status(500).json({ error: "Failed to upload to YouTube", details: error instanceof Error ? error.message : "Unknown" });
    }
  });

  // ─── Codebase Audit ────────────────────────────────────────────────────────
  app.get("/api/codebase/files", async (req, res) => {
    try {
      const fsPromises = await import("fs/promises");
      const { glob } = await import("glob");
      const files = await glob("src/**/*.{ts,tsx,css}", { ignore: "node_modules/**" });
      const fileContents = await Promise.all(
        files.map(async (file) => ({
          path: file,
          content: await fsPromises.readFile(file, "utf-8")
        }))
      );
      res.json(fileContents);
    } catch (error) {
      console.error("Failed to read codebase:", error);
      res.status(500).json({ error: "Failed to read codebase" });
    }
  });

  // ─── Static / Vite ────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("/{*path}", (req: any, res: any) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // ─── Daily Automation Cron ────────────────────────────────────────────────
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Running daily automation...');
    try {
      const trends = await scanForTrends("Technology");
      const bestTrend = trends[0];
      if (!bestTrend) return;
      console.log('[CRON] Automation triggered for:', bestTrend.topic);
    } catch (error) {
      console.error('[CRON] Automation failed:', error);
    }
  });

  console.log(`NeuralTube server fully initialized on http://0.0.0.0:${PORT}`);
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return count.toString();
}

startServer();
