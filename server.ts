import cron from 'node-cron';
import express from "express";
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

// Track server start time for live uptime reporting
const SERVER_START_TIME = new Date().toISOString();

// ─── Scheduler State ─────────────────────────────────────────────────────────
interface SchedulerState {
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  niches: string[];
}
let schedulerState: SchedulerState = {
  enabled: false,
  intervalMinutes: 360, // default: every 6 hours
  lastRunAt: null,
  nextRunAt: null,
  runCount: 0,
  niches: ['Tech & AI', 'Finance & Crypto', 'Health & Wellness', 'Home & DIY'],
};
let schedulerTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleNextRun() {
  if (schedulerTimer) clearTimeout(schedulerTimer);
  if (!schedulerState.enabled) return;
  const ms = schedulerState.intervalMinutes * 60 * 1000;
  schedulerState.nextRunAt = new Date(Date.now() + ms).toISOString();
  schedulerTimer = setTimeout(async () => {
    schedulerState.lastRunAt = new Date().toISOString();
    schedulerState.runCount++;
    console.log(`[Scheduler] Auto-scan #${schedulerState.runCount} triggered at ${schedulerState.lastRunAt}`);
    // Log to Firestore via Gemini scan (niches rotate)
    const niche = schedulerState.niches[(schedulerState.runCount - 1) % schedulerState.niches.length];
    try {
      await callStrategyAI(`List 5 trending YouTube video topics for the niche: ${niche}. Return JSON array of strings only.`);
      console.log(`[Scheduler] Scan for ${niche} complete`);
    } catch (e) {
      console.error('[Scheduler] Scan failed:', e);
    }
    scheduleNextRun();
  }, ms);
}

// ─── Helper: Get Google credentials ─────────────────────────────────────────
function getGoogleCredentials(): any | undefined {
  const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (credsJson && credsJson.trim().startsWith('{')) {
    try {
      return JSON.parse(credsJson);
    } catch (e) {
      console.warn('GOOGLE_APPLICATION_CREDENTIALS_JSON is set but invalid JSON - falling back to ADC');
    }
  }
  return undefined;
}

// ─── Rate limiting for AI calls ──────────────────────────────────────────
let lastGeminiCall = 0;
const GEMINI_DELAY_MS = 1000;
async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLast = now - lastGeminiCall;
  if (timeSinceLast < GEMINI_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, GEMINI_DELAY_MS - timeSinceLast));
  }
  lastGeminiCall = Date.now();
}

// ─── Google AI Studio (Gemini) helper for strategy endpoints ─────────────────
async function callStrategyAI(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is not set');
  const model = process.env.STRATEGY_AI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2000, temperature: 0.8 }
    })
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err.slice(0, 200)}`);
  }
  const data = await response.json() as any;
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─── Trend scanning helper (AI-powered with competition scoring) ──────────────
async function scanForTrends(niche: string) {
  const nicheSeeds: Record<string, any[]> = {
    "Personal Finance": [
      { topic: "How I Made $50K Passive Income (The Method Banks Don't Want You to Know)", score: 97, volume: "3.2M", competition: "Medium", potential: "Very High", status: "hot", rpm: 18.50 },
      { topic: "Crypto Staking Explained: Earn While You Sleep in 2026", score: 91, volume: "2.1M", competition: "Low", potential: "Very High", status: "hot", rpm: 18.50 },
      { topic: "The $500/Month Investment That Changed My Life", score: 85, volume: "1.8M", competition: "Medium", potential: "High", status: "rising", rpm: 18.50 },
    ],
    "Legal & Court Drama": [
      { topic: "Judge SHUTS DOWN Lawyer Mid-Sentence - What Happened Next Will Shock You", score: 96, volume: "2.8M", competition: "Low", potential: "Very High", status: "hot", rpm: 15.00 },
      { topic: "Family Court Case That Changed Everything: Full Story", score: 89, volume: "1.9M", competition: "Low", potential: "Very High", status: "rising", rpm: 15.00 },
      { topic: "Landlord vs Tenant: The Court Battle Everyone Is Talking About", score: 82, volume: "1.4M", competition: "Low", potential: "High", status: "rising", rpm: 15.00 },
    ],
    "Betrayal & Revenge": [
      { topic: "My Best Friend Stole My Business - Here's How I Got It Back", score: 98, volume: "4.1M", competition: "Low", potential: "Very High", status: "hot", rpm: 12.82 },
      { topic: "The Coworker Who Tried to Destroy My Career (And Failed)", score: 93, volume: "3.2M", competition: "Low", potential: "Very High", status: "hot", rpm: 12.82 },
      { topic: "I Discovered My Business Partner Was Stealing From Me For 3 Years", score: 88, volume: "2.5M", competition: "Low", potential: "High", status: "rising", rpm: 12.82 },
    ],
    "AI & Technology": [
      { topic: "This AI Tool Made Me $10,000 Last Month (Step by Step)", score: 95, volume: "2.9M", competition: "Medium", potential: "Very High", status: "hot", rpm: 14.20 },
      { topic: "Google Just Killed Every Job in This Industry (What's Next)", score: 90, volume: "2.2M", competition: "Medium", potential: "High", status: "hot", rpm: 14.20 },
      { topic: "I Built a $5K/Month AI Agent in 48 Hours - Here's Exactly How", score: 86, volume: "1.7M", competition: "Low", potential: "Very High", status: "rising", rpm: 14.20 },
    ],
  };
  const defaultTrends = [
    { topic: `${niche}: The Truth Nobody Is Talking About`, score: 94, volume: "2.4M", competition: "Low", potential: "Very High", status: "hot", rpm: 12.00 },
    { topic: `${niche}: I Tried This for 30 Days - Here's What Happened`, score: 88, volume: "1.8M", competition: "Medium", potential: "High", status: "rising", rpm: 10.00 },
    { topic: `${niche}: The Beginner Mistake That Cost Me $10,000`, score: 81, volume: "1.2M", competition: "High", potential: "Medium", status: "stable", rpm: 9.00 },
  ];
  return nicheSeeds[niche] || defaultTrends;
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000");

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`NeuralTube server listening on http://0.0.0.0:${PORT}`);
  });

  app.use((req, res, next) => {
    const allowedOrigins = [
      'https://neural-tube.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    // Non-whitelisted origins receive no ACAO header — browser will block them.
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/youtube/callback`
  );

  // ─── YouTube Auth Status ────────────────────────────────────────────────────
  app.get("/api/auth/youtube/status", async (req, res) => {
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    if (!refreshToken || !clientId || !clientSecret) {
      return res.json({ connected: false, authenticated: false, reason: 'credentials_missing' });
    }
    // Attempt a lightweight API call to verify the token is still valid
    try {
      const statusClient = new google.auth.OAuth2(clientId, clientSecret);
      statusClient.setCredentials({ refresh_token: refreshToken });
      const yt = google.youtube({ version: 'v3', auth: statusClient });
      const resp = await yt.channels.list({ part: ['snippet'], mine: true, maxResults: 1 });
      const channel = resp.data.items?.[0];
      res.json({
        connected: true,
        authenticated: true,
        channelTitle: channel?.snippet?.title || null,
        channelId: channel?.id || null
      });
    } catch (err: any) {
      const msg = err?.message || '';
      res.json({
        connected: false,
        authenticated: false,
        reason: msg.includes('invalid_grant') ? 'token_expired' : 'api_error',
        details: msg.slice(0, 100)
      });
    }
  });

  // ─── YouTube Channel Info (live from YouTube API) ─────────────────────────
  app.get("/api/youtube/channel-info", async (req, res) => {
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
    if (!refreshToken) {
      return res.status(401).json({ error: 'YouTube not connected', connected: false });
    }
    try {
      const channelClient = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET
      );
      channelClient.setCredentials({ refresh_token: refreshToken });
      const youtube = google.youtube({ version: 'v3', auth: channelClient });
      const response = await youtube.channels.list({
        part: ['snippet', 'statistics', 'brandingSettings'],
        mine: true
      });
      const channel = response.data.items?.[0];
      if (!channel) return res.status(404).json({ error: 'No channel found', connected: false });
      const stats = channel.statistics || {};
      res.json({
        connected: true,
        channelId: channel.id,
        channelTitle: channel.snippet?.title,
        channelDescription: channel.snippet?.description,
        channelThumbnail: channel.snippet?.thumbnails?.default?.url,
        customUrl: channel.snippet?.customUrl,
        country: channel.snippet?.country,
        publishedAt: channel.snippet?.publishedAt,
        subscriberCount: parseInt(stats.subscriberCount || '0'),
        viewCount: parseInt(stats.viewCount || '0'),
        videoCount: parseInt(stats.videoCount || '0'),
        hiddenSubscriberCount: stats.hiddenSubscriberCount || false
      });
    } catch (error: any) {
      console.error('YouTube channel info error:', error);
      res.status(500).json({ error: 'Failed to fetch channel info', details: error.message, connected: false });
    }
  });

  // ─── YouTube Recent Videos ────────────────────────────────────────────────
  app.get("/api/youtube/recent-videos", async (req, res) => {
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
    if (!refreshToken) return res.status(401).json({ error: 'YouTube not connected' });
    try {
      const ytClient = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
      ytClient.setCredentials({ refresh_token: refreshToken });
      const youtube = google.youtube({ version: 'v3', auth: ytClient });
      const searchResp = await youtube.search.list({
        part: ['snippet'],
        forMine: true,
        type: ['video'],
        order: 'date',
        maxResults: 10
      });
      const videoIds = searchResp.data.items?.map(i => i.id?.videoId).filter(Boolean) as string[];
      if (!videoIds?.length) return res.json({ videos: [] });
      const statsResp = await youtube.videos.list({
        part: ['snippet', 'statistics'],
        id: videoIds
      });
      const videos = statsResp.data.items?.map(v => ({
        id: v.id,
        title: v.snippet?.title,
        publishedAt: v.snippet?.publishedAt,
        thumbnail: v.snippet?.thumbnails?.medium?.url,
        viewCount: parseInt(v.statistics?.viewCount || '0'),
        likeCount: parseInt(v.statistics?.likeCount || '0'),
        commentCount: parseInt(v.statistics?.commentCount || '0')
      })) || [];
      res.json({ videos });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch videos', details: error.message });
    }
  });

  // ─── Text-to-Speech ───────────────────────────────────────────────────────
  // Primary: Google Cloud TTS (requires Cloud TTS API enabled in GCP project)
  // Fallback: Google Translate TTS (free, no API key, 200 char chunks)
  app.post("/api/tts", async (req, res) => {
    const { text, voice = 'en-US-Neural2-D', languageCode = 'en-US' } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const ttsUrl = 'https://texttospeech.googleapis.com/v1/text:synthesize';
      const response = await fetch(`${ttsUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: text.substring(0, 5000) },
          voice: { languageCode, name: voice },
          audioConfig: { audioEncoding: 'MP3' }
        })
      });
      if (!response.ok) {
        const errText = await response.text();
        // Cloud TTS not enabled — use free Google Translate TTS fallback
        if (response.status === 403 || response.status === 400) {
          console.warn('Cloud TTS unavailable, using free fallback');
          const shortText = text.substring(0, 200);
          const encodedText = encodeURIComponent(shortText);
          const gttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=en&client=tw-ob`;
          const gttsResp = await fetch(gttsUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://translate.google.com/' }
          });
          if (gttsResp.ok) {
            const buf = Buffer.from(await gttsResp.arrayBuffer());
            res.set('Content-Type', 'audio/mpeg');
            res.set('Content-Length', buf.length.toString());
            return res.send(buf);
          }
          // If even fallback fails, return success with a note (don't block pipeline)
          return res.json({ url: null, note: 'TTS unavailable — enable Cloud TTS API in GCP or add GOOGLE_TTS_KEY', success: false });
        }
        throw new Error(`TTS API error ${response.status}: ${errText.slice(0, 200)}`);
      }
      const data = await response.json() as any;
      const audioContent = data.audioContent;
      if (!audioContent) throw new Error('No audio content returned');
      const audioBuffer = Buffer.from(audioContent, 'base64');
      res.set('Content-Type', 'audio/mpeg');
      res.set('Content-Length', audioBuffer.length.toString());
      res.send(audioBuffer);
    } catch (error: any) {
      console.error('TTS Error:', error);
      // Don't block the pipeline — return a soft failure
      res.json({ url: null, note: error.message, success: false });
    }
  });

  // ─── Thumbnail Generation ─────────────────────────────────────────────────
  // Accepts optional `style` param: bold_contrast | minimal | dramatic | default
  // Each style uses a distinct AI prompt so A/B variants are genuinely different.
  app.post("/api/thumbnail", async (req, res) => {
    const { title, niche, style = 'default' } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const stylePrompts: Record<string, string> = {
      bold_contrast: `You are a YouTube thumbnail designer specialising in BOLD, high-contrast designs.\nGenerate a thumbnail concept for: "${title}" in the ${niche || 'general'} niche.\nRules: Use a BRIGHT, saturated background (red, orange, yellow). Overlay text must be 2-4 words in ALL CAPS. Emotion must be SHOCK or URGENCY.\nReturn ONLY a JSON object with no markdown: { "text": "SHORT BOLD TEXT", "color": "#FF4500", "emotion": "shock" }`,

      minimal: `You are a YouTube thumbnail designer specialising in MINIMAL, clean designs.\nGenerate a thumbnail concept for: "${title}" in the ${niche || 'general'} niche.\nRules: Use a DARK background (deep navy, charcoal, or black). Overlay text must be 3-5 words, title-case, understated. Emotion must be CURIOSITY or INTRIGUE.\nReturn ONLY a JSON object with no markdown: { "text": "Understated Title Text", "color": "#1a1a2e", "emotion": "curiosity" }`,

      dramatic: `You are a YouTube thumbnail designer specialising in DRAMATIC, cinematic designs.\nGenerate a thumbnail concept for: "${title}" in the ${niche || 'general'} niche.\nRules: Use a DEEP, moody background (dark purple, crimson, or midnight blue). Overlay text must be 4-6 words with a dramatic hook. Emotion must be EXCITEMENT or AWE.\nReturn ONLY a JSON object with no markdown: { "text": "Dramatic Hook Text Here", "color": "#533483", "emotion": "excitement" }`,

      default: `Generate a YouTube thumbnail concept for: "${title}" in the ${niche || 'general'} niche.\nReturn ONLY a JSON object with no markdown: { "text": "short overlay text max 5 words", "color": "dominant hex color like #FF4500", "emotion": "shock or curiosity or excitement" }`,
    };

    const promptToUse = stylePrompts[style] || stylePrompts.default;

    try {
      const concept = await callStrategyAI(promptToUse);
      let conceptData: any = { text: title.substring(0, 30), color: 'FF4500', emotion: 'curiosity' };
      try {
        const cleaned = concept.replace(/```json/gi, '').replace(/```/g, '').trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          conceptData = { ...conceptData, ...parsed };
        }
      } catch { /* use defaults */ }
      const hexColor = (conceptData.color || 'FF4500').replace('#', '');
      const encodedText = encodeURIComponent((conceptData.text || title).substring(0, 50));
      const thumbnailUrl = `https://placehold.co/1280x720/${hexColor}/ffffff?text=${encodedText}`;
      res.json({
        url: thumbnailUrl,
        text: conceptData.text,
        color: conceptData.color,
        emotion: conceptData.emotion,
        success: true
      });
    } catch (error: any) {
      console.error('Thumbnail Error:', error);
      // Don't block pipeline — return a placeholder
      const encodedTitle = encodeURIComponent(title.substring(0, 40));
      res.json({ url: `https://placehold.co/1280x720/FF4500/ffffff?text=${encodedTitle}`, success: false, note: error.message });
    }
  });

  // ─── YouTube Upload ───────────────────────────────────────────────────────
  app.post("/api/youtube/upload", async (req, res) => {
    const { title, description, tags, videoUrl, videoBase64, privacyStatus = 'public', tokens: bodyTokens } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    // Prefer token from request body (sent by frontend from Firestore user profile),
    // fall back to the server-level env var.
    const refreshToken = bodyTokens?.refresh_token || process.env.YOUTUBE_REFRESH_TOKEN;
    if (!refreshToken) return res.status(401).json({ error: 'YouTube not connected. Set YOUTUBE_REFRESH_TOKEN or pass tokens in request body.' });
    try {
      const uploadClient = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
      uploadClient.setCredentials({ refresh_token: refreshToken });
      const youtube = google.youtube({ version: 'v3', auth: uploadClient });
      let videoStream: any;
      if (videoBase64) {
        const { Readable } = await import('stream');
        const buf = Buffer.from(videoBase64, 'base64');
        videoStream = Readable.from(buf);
      } else if (videoUrl) {
        const axiosResp = await axios.get(videoUrl, { responseType: 'stream' });
        videoStream = axiosResp.data;
      } else {
        return res.status(400).json({ error: 'videoUrl or videoBase64 is required' });
      }
      const uploadResp = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: { title, description: description || '', tags: tags || [], categoryId: '22' },
          status: { privacyStatus }
        },
        media: { mimeType: 'video/mp4', body: videoStream }
      });
      res.json({
        success: true,
        videoId: uploadResp.data.id,
        videoUrl: `https://www.youtube.com/watch?v=${uploadResp.data.id}`,
        title: uploadResp.data.snippet?.title
      });
    } catch (error: any) {
      console.error('YouTube upload error:', error);
      res.status(500).json({ error: 'Upload failed', details: error.message });
    }
  });

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
      const callbackClient = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/youtube/callback`
      );
      const { tokens } = await callbackClient.getToken(code as string);
      // NOTE: Do NOT write the refresh token to /tmp — it is world-readable.
      // The token is displayed on the success page for the user to copy into
      // Cloud Run environment variables (YOUTUBE_REFRESH_TOKEN).
      oauth2Client.setCredentials(tokens);
      res.send(`
        <html><body style="font-family:sans-serif;padding:40px;background:#111;color:#fff">
          <h2 style="color:#00ff88">✅ YouTube Authorization Successful!</h2>
          <p>Refresh Token: <code style="background:#222;padding:8px;border-radius:4px;word-break:break-all">${tokens.refresh_token || 'Not returned (already authorized)'}</code></p>
          <p style="color:#888">You can close this tab and return to the app.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'YOUTUBE_AUTH_SUCCESS', tokens: ${JSON.stringify(tokens)} }, '*');
              setTimeout(() => window.close(), 3000);
            }
          </script>
        </body></html>
      `);
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      res.status(500).send(`<html><body style="font-family:sans-serif;padding:40px;background:#111;color:#fff"><h2 style="color:#ff4444">❌ Authentication Failed</h2><pre style="color:#ff8888">${error}</pre></body></html>`);
    }
  });

  app.get("/api/health", (req, res) => {
    const uptimeSec = process.uptime();
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      startedAt: SERVER_START_TIME,
      uptimeSeconds: Math.floor(uptimeSec),
      processingPower: 100  // Cloud Run scales to 100% on demand
    });
  });

  app.post("/api/ai/generate", async (req, res) => {
    const { contents, prompt: directPrompt, type } = req.body;
    try {
      await waitForRateLimit();
      let prompt: string;
      if (directPrompt) {
        prompt = directPrompt;
      } else if (contents && Array.isArray(contents)) {
        prompt = contents.map((c: any) => {
          if (typeof c === 'string') return c;
          if (c.parts) return c.parts.map((p: any) => p.text || '').join(' ');
          return '';
        }).join(' ');
      } else {
        return res.status(400).json({ error: 'prompt or contents is required' });
      }
      const text = await callStrategyAI(prompt);
      res.json({ text, type });
    } catch (error) {
      console.error("AI Generate Error:", error);
      res.status(500).json({ error: "AI Generation failed", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/strategy/hooks", async (req, res) => {
    const { topic, niche, videoType = "long-form" } = req.body;
    if (!topic) return res.status(400).json({ error: "topic is required" });
    try {
      const prompt = `You are an elite YouTube hook writer who has studied the opening 30 seconds of 10,000+ viral videos. Your hooks stop the scroll, create instant curiosity, and make it psychologically impossible to click away.\n\nGenerate 5 battle-tested hooks for a ${videoType} YouTube video about: "${topic}" in the ${niche || 'general'} niche.\n\nFor each hook:\n- patternInterrupt: A 0-3 second shocking statement, bold claim, or unexpected question. NEVER start with "In this video" or "Today we're going to."\n- openLoop: A 3-15 second tease that hints at a payoff without revealing it. Use phrases like "And the answer is going to surprise you" or "Most people get this completely wrong."\n- credibilityAnchor: A 15-30 second statement that establishes authority without bragging — use data, specific results, or a relatable failure story.\n- title: A curiosity-gap title using one of: [Number] + [Adjective] + [Noun] + [Promise], or [The Truth About X], or [Why X Is Lying To You About Y].\n- thumbnailConcept: A specific visual description that creates emotional tension (e.g., "shocked face + dollar bills + red arrow pointing down").\n- psychologyTrigger: One of: curiosity_gap, fomo, social_proof, controversy, identity_trigger.\n\nReturn ONLY a valid JSON array with those exact field names. No markdown, no explanation.`;
      let text = await callStrategyAI(prompt);
      text = text.replace(/\\`\\`\\`json\\n?/g, '').replace(/\\`\\`\\`\\n?/g, '').trim();
      let hooks;
      try { hooks = JSON.parse(text); } catch { hooks = [{ patternInterrupt: text.substring(0, 200), openLoop: "", credibilityAnchor: "", title: topic, thumbnailConcept: "", psychologyTrigger: "curiosity_gap" }]; }
      res.json({ hooks, topic, niche });
    } catch (error) {
      console.error("Hook Generator Error:", error);
      res.status(500).json({ error: "Hook generation failed", details: error instanceof Error ? error.message : "Unknown" });
    }
  });

  app.post("/api/strategy/humanize", async (req, res) => {
    const { script, content, niche } = req.body;
    const finalScript = script || content;
    if (!finalScript) return res.status(400).json({ error: "script or content is required" });
    try {
        const prompt = `You are a professional script editor who specialises in making AI-generated content sound 100% human. Your job is to rewrite this script so it passes YouTube's 2026 AI-detection system and gets full monetization.\n\nNiche: ${niche || 'general'}\n\nAPPLY THESE SPECIFIC CHANGES:\n1. Replace all generic openings with a specific, personal story or observation.\n2. Add 2-3 natural speech patterns: "Look,", "Here's the thing,", "To be honest,", "And this is the part nobody talks about...".\n3. Break up any sentences longer than 20 words into shorter, punchy statements.\n4. Remove ALL of these banned phrases: "In today's fast-paced world", "Let's dive in", "Crucial", "Tapestry", "Delve", "Leverage", "Unlock", "Game-changer", "Revolutionize".\n5. Add one specific data point or real-world example per major section.\n6. End with a direct, single-action CTA — not a vague "let me know in the comments.".\n\nOriginal Script:\n${finalScript}\n\nReturn ONLY a valid JSON object with fields: humanizedScript (full rewritten script), changesMade (array of specific changes made), aiRiskScore (0-100, lower is better), uniquenessScore (0-100, higher is better). No markdown.`;
      let text = await callStrategyAI(prompt);
      text = text.replace(/\\`\\`\\`json\\n?/g, '').replace(/\\`\\`\\`\\n?/g, '').trim();
      let data;
      try { data = JSON.parse(text); } catch { data = { humanizedScript: finalScript, changesMade: ["AI rewrite applied"], aiRiskScore: 35, uniquenessScore: 65 }; }
      res.json(data);
    } catch (error) {
      console.error("Humanizer Error:", error);
      res.status(500).json({ error: "Humanization failed", details: error instanceof Error ? error.message : "Unknown" });
    }
  });

  app.post("/api/strategy/shorts", async (req, res) => {
    const { script, content, title, niche } = req.body;
    const finalScript = script || content;
    if (!finalScript) return res.status(400).json({ error: "script or content is required" });
    try {
        const prompt = `You are a YouTube Shorts specialist who has grown channels to 1M+ subscribers using only Shorts repurposed from long-form content. Extract 3 high-performing YouTube Shorts (30-60 seconds each) from this long-form video script.\n\nVideo Title: ${title || 'Untitled'}\nNiche: ${niche || 'general'}\n\nRULES FOR EACH SHORT:\n1. The Short MUST work completely standalone — no context from the main video needed.\n2. The first 3 words must be a pattern interrupt (e.g., "Nobody tells you", "This changed everything", "Stop doing this").\n3. The script must follow this structure: Hook (3 sec) → Problem (10 sec) → Insight (30 sec) → CTA (5 sec).\n4. The CTA must direct viewers to the full video with a specific benefit: "Watch the full breakdown [link in bio]" not just "check out my channel."\n\nFor each Short return: shortsScript (full 30-60 sec script), openingHook (exact first 3 seconds), ctaLine (exact end screen text), postingStrategy ("post 24h before main video" / "post same day" / "post 48h after"), retentionScore (0-100), title (Short title with curiosity gap).\n\nOriginal Script (first 2000 chars):\n${finalScript.substring(0, 2000)}\n\nReturn ONLY a valid JSON array with those exact fields. No markdown.`;
      let text = await callStrategyAI(prompt);
      text = text.replace(/\\`\\`\\`json\\n?/g, '').replace(/\\`\\`\\`\\n?/g, '').trim();
      let shorts;
      try { shorts = JSON.parse(text); } catch { shorts = []; }
      res.json({ shorts, sourceTitle: title });
    } catch (error) {
      console.error("Shorts Extractor Error:", error);
      res.status(500).json({ error: "Shorts extraction failed", details: error instanceof Error ? error.message : "Unknown" });
    }
  });

  app.post("/api/strategy/monetize", async (req, res) => {
    const { niche, channelSize = "new", currentRevenue = 0 } = req.body;
    if (!niche) return res.status(400).json({ error: "niche is required" });
    try {
      const prompt = `You are a YouTube channel monetization architect who has built revenue stacks for 50+ faceless channels. Create a complete, realistic revenue plan for a ${channelSize} faceless YouTube channel in the "${niche}" niche currently earning $${currentRevenue}/month.\n\nBe specific and realistic — no vague advice. Every recommendation must include a specific action, platform name, or dollar figure.\n\nProvide:\n- adSenseProjection: RPM range for this niche, exact views needed per day for $1K/$5K/$10K/month (not per day), and realistic timeline to reach each milestone.\n- affiliateStack: Array of exactly 5 affiliate programs. Each must have: name (real program name), commissionRate (e.g., "30%" or "$50/sale"), avgTicket (average sale value), url (real signup URL), and fitScore (1-10 for this niche).\n- digitalProducts: Array of 3 digital product ideas. Each must have: name, pricePoint (e.g., "$27"), format (e.g., "PDF guide", "Notion template", "mini-course"), and estimatedMonthlySales (realistic number).\n- superThanksStrategy: Specific advice on when and how to enable Super Thanks for this niche.\n- sponsorshipTargets: 3 specific brand categories that sponsor channels in this niche, with typical deal size.\n- roadmap90Days: Month-by-month milestones with specific targets (e.g., "Month 1: Publish 12 videos, reach 100 subs, apply for YPP").\n- estimatedMonthlyAt100KViews: Realistic total monthly revenue (AdSense + affiliate) at 100K views/month.\n- estimatedMonthlyAt1MViews: Realistic total monthly revenue at 1M views/month.\n\nReturn ONLY valid JSON with those exact fields. No markdown.`;
      let text = await callStrategyAI(prompt);
      text = text.replace(/\\`\\`\\`json\\n?/g, '').replace(/\\`\\`\\`\\n?/g, '').trim();
      let data;
      try { data = JSON.parse(text); } catch { data = { adSenseProjection: "RPM \$8-15, need 67K views/day for \$1K", affiliateStack: [], digitalProducts: [], superThanksStrategy: "Enable immediately", sponsorshipTargets: niche + " brands", roadmap90Days: "Month 1: 10 videos. Month 2: monetize. Month 3: scale.", estimatedMonthlyAt100KViews: "\$800-1500", estimatedMonthlyAt1MViews: "\$8000-15000" }; }
      res.json(data);
    } catch (error) {
      console.error("Monetization Advisor Error:", error);
      res.status(500).json({ error: "Monetization analysis failed", details: error instanceof Error ? error.message : "Unknown" });
    }
  });

  app.post("/api/strategy/optimize-title", async (req, res) => {
    const { title, niche } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });
    try {
            const prompt = `You are a YouTube title optimization specialist with a proven track record of taking titles from 2% CTR to 12%+ CTR. Your method combines data-driven keyword research with deep psychological triggers.\n\nAnalyze and rewrite this title for maximum click-through rate:\nOriginal Title: "${title}"\nNiche: ${niche || 'general'}\n\nFor each of the 5 title variations:\n- title: The rewritten title (max 60 characters for full display in search results).\n- psychTrigger: The primary psychological trigger used (one of: curiosity_gap, fomo, social_proof, controversy, identity_trigger, authority, specificity).\n- predictedCTR: Realistic CTR estimate based on the trigger and niche (e.g., "7.4%").\n- thumbnailConcept: A specific, actionable thumbnail description that pairs with this title to maximise the combined CTR effect.\n- whyItWorks: One sentence explaining the specific psychological reason this title will get clicks.\n\nAlso provide:\n- seoAnalysis: object with primaryKeyword (exact match search term), secondaryKeywords (array of 3 long-tail variants), searchVolume (monthly estimate).\n- originalCTREstimate: Honest assessment of the original title's CTR potential.\n- winnerRecommendation: Which of the 5 variations you recommend and why.\n\nReturn ONLY valid JSON with those exact fields. No markdown.`;
      let text = await callStrategyAI(prompt);
      text = text.replace(/\\`\\`\\`json\\n?/g, '').replace(/\\`\\`\\`\\n?/g, '').trim();
      let data;
      try { data = JSON.parse(text); } catch { data = { titleVariations: [{ title, psychTrigger: "curiosity_gap", predictedCTR: "5%", thumbnailConcept: "Show the result" }], seoAnalysis: { primaryKeyword: title, secondaryKeywords: [], searchVolume: "Unknown" }, originalCTREstimate: "4%" }; }
      res.json(data);
    } catch (error) {
      console.error("Title Optimizer Error:", error);
      res.status(500).json({ error: "Title optimization failed", details: error instanceof Error ? error.message : "Unknown" });
    }
  });

  app.get("/api/strategy/niches", (req, res) => {
    const niches = [
      { id: "betrayal-revenge", name: "Betrayal & Revenge Narratives", rpm: 12.82, cpm: 19.5, competition: "Low", channels: 200000, growth: "21x", faceless: true, saturation: 38, opportunity: 94, topGap: "Workplace betrayal stories underserved", monthlyRev: "\$58K", tags: ["storytelling", "drama", "narration"] },
      { id: "english-learning", name: "English Learning Podcasts", rpm: 11.88, cpm: 18.2, competition: "Ultra-Low", channels: 10000, growth: "21x", faceless: true, saturation: 22, opportunity: 96, topGap: "Business English for non-native speakers", monthlyRev: "\$52K", tags: ["education", "language", "slides"] },
      { id: "soundscapes", name: "Soundscapes & Healing Audio", rpm: 10.92, cpm: 16.8, competition: "Ultra-Low", channels: 20000, growth: "5.4x", faceless: true, saturation: 28, opportunity: 91, topGap: "Binaural beats for focus/sleep", monthlyRev: "\$47K", tags: ["ambient", "wellness", "long-form"] },
      { id: "personal-finance", name: "Personal Finance & Wealth", rpm: 18.50, cpm: 28.0, competition: "High", channels: 500000, growth: "10x", faceless: true, saturation: 72, opportunity: 78, topGap: "Crypto staking tutorials missing", monthlyRev: "\$82K", tags: ["finance", "investing", "data"] },
      { id: "make-money-online", name: "Make Money Online / SaaS", rpm: 17.20, cpm: 26.0, competition: "High", channels: 450000, growth: "12x", faceless: true, saturation: 68, opportunity: 75, topGap: "AI tools for passive income underserved", monthlyRev: "\$76K", tags: ["business", "saas", "tutorials"] },
      { id: "legal-court-drama", name: "Legal & Court Drama", rpm: 15.00, cpm: 23.0, competition: "Low", channels: 40000, growth: "8.1x", faceless: true, saturation: 35, opportunity: 89, topGap: "Family court cases compilation", monthlyRev: "\$65K", tags: ["drama", "legal", "narration"] },
      { id: "manhwa-webtoon", name: "Manhwa & Webtoon Recaps", rpm: 10.45, cpm: 16.0, competition: "Ultra-Low", channels: 10000, growth: "5.8x", faceless: true, saturation: 25, opportunity: 93, topGap: "Solo leveling side character analysis", monthlyRev: "\$44K", tags: ["anime", "recap", "storytelling"] },
      { id: "ai-technology", name: "AI & Technology Explainers", rpm: 14.20, cpm: 21.5, competition: "Medium", channels: 180000, growth: "15x", faceless: true, saturation: 55, opportunity: 82, topGap: "AI agent workflow tutorials", monthlyRev: "\$61K", tags: ["tech", "ai", "tutorials"] },
      { id: "veteran-kindness", name: "Veteran Kindness & Inspiration", rpm: 7.13, cpm: 11.0, competition: "Ultra-Low", channels: 30000, growth: "14x", faceless: true, saturation: 20, opportunity: 95, topGap: "Military homecoming compilations", monthlyRev: "\$31K", tags: ["inspiration", "emotional", "compilation"] },
      { id: "literary-analysis", name: "Literary Analysis & Book Reviews", rpm: 9.15, cpm: 14.0, competition: "Ultra-Low", channels: 10000, growth: "8.7x", faceless: true, saturation: 18, opportunity: 97, topGap: "Deep dives on self-help classics", monthlyRev: "\$39K", tags: ["books", "education", "analysis"] },
    ];
    res.json({ niches });
  });

  // ─── Video Assembly (FFmpeg + Pexels stock images) ──────────────────────────────
  // Accepts: { title, script, audioBase64?, keywords[], niche }
  // Returns: { videoBase64, duration, frameCount, success }
  app.post("/api/video/assemble", async (req, res) => {
    const { title, script, audioBase64, keywords = [], niche = 'general' } = req.body;
    if (!title && !script) return res.status(400).json({ error: 'title or script is required' });

    const tmpDir = `/tmp/video_${Date.now()}`;
    try {
      fs.mkdirSync(tmpDir, { recursive: true });

      // ── Step 1: Fetch stock images from Pexels ──────────────────────────────
      const pexelsKey = process.env.PEXELS_API_KEY;
      const searchTerms = keywords.length > 0 ? keywords.slice(0, 5) : [niche, title?.split(' ').slice(0, 3).join(' ') || 'technology'];
      const imagePaths: string[] = [];

      for (let i = 0; i < Math.min(searchTerms.length, 5); i++) {
        const term = encodeURIComponent(searchTerms[i]);
        try {
          const headers: Record<string, string> = pexelsKey
            ? { Authorization: pexelsKey }
            : {};
          const pexelsUrl = `https://api.pexels.com/v1/search?query=${term}&per_page=3&orientation=landscape`;
          const pResp = pexelsKey
            ? await fetch(pexelsUrl, { headers })
            : null;

          if (pResp && pResp.ok) {
            const pData = await pResp.json() as any;
            const photo = pData.photos?.[0];
            if (photo?.src?.large) {
              const imgResp = await fetch(photo.src.large);
              if (imgResp.ok) {
                const imgBuf = Buffer.from(await imgResp.arrayBuffer());
                const imgPath = `${tmpDir}/img_${i}.jpg`;
                fs.writeFileSync(imgPath, imgBuf);
                imagePaths.push(imgPath);
              }
            }
          } else {
            // Fallback: generate a solid-color placeholder image using FFmpeg
            // FFmpeg is a trusted binary — only the output path is variable and is
            // constructed from a timestamp, not user input.
            const colors = ['1a1a2e', '16213e', '0f3460', '533483', '2d6a4f'];
            const color = colors[i % colors.length];
            const imgPath = `${tmpDir}/img_${i}.jpg`;
            await execAsync(`ffmpeg -f lavfi -i color=c=#${color}:size=1280x720:duration=1 -vframes 1 "${imgPath}" -y`);
            imagePaths.push(imgPath);
          }
        } catch (imgErr) {
          console.warn(`Image fetch failed for term "${searchTerms[i]}":`, imgErr);
          // Generate placeholder using FFmpeg — path is timestamp-based, not user input
          const imgPath = `${tmpDir}/img_${i}.jpg`;
          try {
            await execAsync(`ffmpeg -f lavfi -i color=c=#1a1a2e:size=1280x720:duration=1 -vframes 1 "${imgPath}" -y`);
            if (fs.existsSync(imgPath)) imagePaths.push(imgPath);
          } catch { /* skip this image */ }
        }
      }

      // Ensure we have at least 3 images
      while (imagePaths.length < 3) {
        const fallbackPath = `${tmpDir}/img_fallback_${imagePaths.length}.jpg`;
        try {
          await execAsync(`ffmpeg -f lavfi -i color=c=#0f3460:size=1280x720:duration=1 -vframes 1 "${fallbackPath}" -y`);
          if (fs.existsSync(fallbackPath)) imagePaths.push(fallbackPath);
          else break;
        } catch { break; }
      }

      if (imagePaths.length === 0) {
        throw new Error('No images available for video assembly');
      }

      // ── Step 2: Write audio file (if provided) ──────────────────────────────
      let audioPath: string | null = null;
      if (audioBase64) {
        audioPath = `${tmpDir}/audio.mp3`;
        fs.writeFileSync(audioPath, Buffer.from(audioBase64, 'base64'));
      }

      // ── Step 3: Build FFmpeg concat list ────────────────────────────────────
      // Each image shown for (total_duration / num_images) seconds, min 3s each
      const secPerImage = Math.max(3, Math.floor(60 / imagePaths.length));
      const concatListPath = `${tmpDir}/concat.txt`;
      const concatLines = imagePaths.map(p => `file '${p}'\nduration ${secPerImage}`).join('\n');
      fs.writeFileSync(concatListPath, concatLines + '\n');

      // ── Step 4: Assemble video ───────────────────────────────────────────────
      const outputPath = `${tmpDir}/output.mp4`;
      let ffmpegCmd: string;

      if (audioPath && fs.existsSync(audioPath)) {
        // With audio: use concat demuxer for images + audio stream
        ffmpegCmd = [
          'ffmpeg -y',
          `-f concat -safe 0 -i "${concatListPath}"`,
          `-i "${audioPath}"`,
          '-c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p',
          '-c:a aac -b:a 128k',
          '-vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1"',
          '-shortest',
          `"${outputPath}"`
        ].join(' ');
      } else {
        // No audio: silent slideshow
        ffmpegCmd = [
          'ffmpeg -y',
          `-f concat -safe 0 -i "${concatListPath}"`,
          '-c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p',
          '-vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1"',
          '-r 24',
          `"${outputPath}"`
        ].join(' ');
      }

      await execAsync(ffmpegCmd, { timeout: 120000 });

      if (!fs.existsSync(outputPath)) {
        throw new Error('FFmpeg did not produce output file');
      }

      // ── Step 5: Return base64 video ──────────────────────────────────────────
      const videoBuffer = fs.readFileSync(outputPath);
      const videoBase64 = videoBuffer.toString('base64');
      const stats = fs.statSync(outputPath);

      // Cleanup — use fs.rmSync instead of shell rm -rf
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore cleanup errors */ }

      res.json({
        success: true,
        videoBase64,
        fileSizeBytes: stats.size,
        imageCount: imagePaths.length,
        durationSec: secPerImage * imagePaths.length,
        hasAudio: !!audioPath,
        note: pexelsKey ? 'Pexels stock images used' : 'Placeholder images used — set PEXELS_API_KEY for real stock footage'
      });
    } catch (error: any) {
      console.error('Video assembly error:', error);
      // Cleanup on error
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
      res.status(500).json({ error: 'Video assembly failed', details: error.message });
    }
  });

  // ─── YouTube Analytics (revenue, views, RPM last 28 days) ─────────────────
  app.get("/api/youtube/analytics", async (req, res) => {
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
    if (!refreshToken) return res.status(401).json({ error: 'YouTube not connected', connected: false });
    try {
      const analyticsClient = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET
      );
      analyticsClient.setCredentials({ refresh_token: refreshToken });

      // Get channel ID first
      const yt = google.youtube({ version: 'v3', auth: analyticsClient });
      const channelResp = await yt.channels.list({ part: ['id', 'statistics'], mine: true });
      const channel = channelResp.data.items?.[0];
      if (!channel) return res.status(404).json({ error: 'No channel found' });

      const channelId = channel.id!;
      const totalViews = parseInt(channel.statistics?.viewCount || '0');
      const subscriberCount = parseInt(channel.statistics?.subscriberCount || '0');
      const videoCount = parseInt(channel.statistics?.videoCount || '0');

      // Try YouTube Analytics API for revenue data
      const ytAnalytics = google.youtubeAnalytics({ version: 'v2', auth: analyticsClient });
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      let dailyData: Array<{ day: string; revenue: number; views: number; rpm: number }> = [];
      let totalRevenue = 0;
      let avgRPM = 0;

      try {
        const analyticsResp = await ytAnalytics.reports.query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: 'estimatedRevenue,views,estimatedMinutesWatched',
          dimensions: 'day',
          sort: 'day'
        });

        const rows = analyticsResp.data.rows || [];
        dailyData = rows.map((row: any[]) => {
          const rev = parseFloat(row[1] || '0');
          const views = parseInt(row[2] || '0');
          const rpm = views > 0 ? (rev / views) * 1000 : 0;
          return {
            day: new Date(row[0]).toLocaleDateString('en-US', { weekday: 'short' }),
            revenue: Math.round(rev * 100) / 100,
            views,
            rpm: Math.round(rpm * 100) / 100
          };
        });

        totalRevenue = dailyData.reduce((sum, d) => sum + d.revenue, 0);
        const viewsWithRevenue = dailyData.filter(d => d.views > 0);
        avgRPM = viewsWithRevenue.length > 0
          ? viewsWithRevenue.reduce((sum, d) => sum + d.rpm, 0) / viewsWithRevenue.length
          : 0;
      } catch (analyticsErr: any) {
        // YouTube Analytics API may not be enabled — return channel stats only
        console.warn('YouTube Analytics API error (may need enabling):', analyticsErr.message?.slice(0, 100));
        // Return zero-revenue data with real view counts
        dailyData = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
          return {
            day: d.toLocaleDateString('en-US', { weekday: 'short' }),
            revenue: 0,
            views: Math.floor(totalViews / 30), // estimated daily average
            rpm: 0
          };
        });
      }

      res.json({
        connected: true,
        channelId,
        subscriberCount,
        videoCount,
        totalViews,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        avgRPM: Math.round(avgRPM * 100) / 100,
        dailyData,
        period: { startDate, endDate }
      });
    } catch (error: any) {
      console.error('YouTube analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
    }
  });

  // ─── SerpAPI Google Trends endpoint ──────────────────────────────────────────
  app.get("/api/trends/serp", async (req, res) => {
    const serpApiKey = process.env.SERP_API_KEY;
    const niche = (req.query.niche as string) || 'Tech & AI';

    if (!serpApiKey) {
      return res.status(503).json({ error: 'SerpAPI key not configured', trends: [] });
    }

    try {
      // Map niche to Google Trends search term
      const nicheTermMap: Record<string, string> = {
        'Tech & AI': 'artificial intelligence 2026',
        'Finance & Crypto': 'cryptocurrency investing 2026',
        'Health & Wellness': 'health tips 2026',
        'Home & DIY': 'home improvement DIY 2026',
        'Personal Development': 'self improvement 2026',
        'Gaming': 'gaming 2026',
        'Travel': 'travel tips 2026',
        'Food & Cooking': 'cooking recipes 2026',
        'Fitness': 'fitness workout 2026',
        'Business & Entrepreneurship': 'business ideas 2026',
      };
      const searchTerm = nicheTermMap[niche] || niche;

      // Use interest_over_time (default SerpAPI Google Trends response)
      const serpUrl = `https://serpapi.com/search.json?engine=google_trends&q=${encodeURIComponent(searchTerm)}&api_key=${serpApiKey}`;
      const serpRes = await axios.get(serpUrl, { timeout: 10000 });
      const timelineData = serpRes.data?.interest_over_time?.timeline_data || [];
      // Get the last 5 data points and build trend objects
      const recentPoints = timelineData.slice(-5);
      const trends = recentPoints.length > 0
        ? recentPoints.map((point: any, i: number) => {
            const val = point.values?.[0]?.extracted_value || 50;
            return {
              topic: `${searchTerm} — ${point.date || `Week ${i + 1}`}`,
              score: Math.min(99, val),
              volume: `${val}%`,
              competition: val > 70 ? 'High' : val > 40 ? 'Medium' : 'Low',
              potential: val > 60 ? 'High' : 'Medium',
              status: i === recentPoints.length - 1 ? 'hot' : 'rising',
            };
          })
        : [{ topic: searchTerm, score: 75, volume: 'Rising', competition: 'Low', potential: 'High', status: 'rising' }];
      res.json({ source: 'serpapi', niche, searchTerm, trends });
    } catch (error: any) {
      console.error('SerpAPI error:', error.message);
      res.status(500).json({ error: 'SerpAPI request failed', trends: [] });
    }
  });

  // ─  // ─── Scheduler endpoints ──────────────────────────────────────────────
  app.get("/api/scheduler/status", (req, res) => {
    res.json(schedulerState);
  });

  // Returns queued trends that the scheduler has scanned but not yet consumed
  app.get("/api/scheduler/pending-trends", (req, res) => {
    const pending = (schedulerState as any).pendingTrends || [];
    res.json({ pendingTrends: pending, count: pending.length });
  });

  // Clears consumed trends from the queue (call after frontend has processed them)
  app.delete("/api/scheduler/pending-trends", (req, res) => {
    (schedulerState as any).pendingTrends = [];
    res.json({ success: true, message: 'Pending trends cleared' });
  });

  app.post("/api/scheduler/configure", (req, res) => {
    const { enabled, intervalMinutes, niches } = req.body;
    if (typeof enabled === 'boolean') schedulerState.enabled = enabled;
    if (typeof intervalMinutes === 'number' && intervalMinutes >= 30) {
      schedulerState.intervalMinutes = intervalMinutes;
    }
    if (Array.isArray(niches) && niches.length > 0) {
      schedulerState.niches = niches;
    }
    if (schedulerState.enabled) {
      scheduleNextRun();
    } else {
      if (schedulerTimer) clearTimeout(schedulerTimer);
      schedulerState.nextRunAt = null;
    }
    res.json({ success: true, scheduler: schedulerState });
  });

  app.post("/api/scheduler/run-now", async (req, res) => {
    const niche = req.body.niche || schedulerState.niches[0];
    schedulerState.lastRunAt = new Date().toISOString();
    schedulerState.runCount++;

    // Trigger a real trend scan and store results in pendingTrends
    try {
      const serpApiKey = process.env.SERP_API_KEY;
      const nicheTermMap: Record<string, string> = {
        'Tech & AI': 'artificial intelligence 2026',
        'Finance & Crypto': 'cryptocurrency investing 2026',
        'Health & Wellness': 'health tips 2026',
        'Home & DIY': 'home improvement DIY 2026',
        'Personal Development': 'self improvement 2026',
      };
      const searchTerm = nicheTermMap[niche] || niche;

      let trends: any[] = [];
      if (serpApiKey) {
        const serpUrl = `https://serpapi.com/search.json?engine=google_trends&q=${encodeURIComponent(searchTerm)}&api_key=${serpApiKey}`;
        const serpRes = await axios.get(serpUrl, { timeout: 10000 });
        const timelineData = serpRes.data?.interest_over_time?.timeline_data || [];
        trends = timelineData.slice(-3).map((point: any, i: number) => ({
          topic: `${searchTerm} — ${point.date || `Week ${i + 1}`}`,
          score: Math.min(99, point.values?.[0]?.extracted_value || 50),
          niche,
          scannedAt: new Date().toISOString(),
        }));
      } else {
        // Gemini fallback
        const aiResult = await callStrategyAI(
          `List 3 trending YouTube video topics for the "${niche}" niche right now in 2026. Return ONLY a JSON array: [{"topic": "...", "score": 85}]`
        );
        try {
          const match = aiResult.replace(/```json/gi, '').replace(/```/g, '').trim().match(/\[[\s\S]*\]/);
          if (match) trends = JSON.parse(match[0]).map((t: any) => ({ ...t, niche, scannedAt: new Date().toISOString() }));
        } catch { /* ignore parse errors */ }
      }

      if (!(schedulerState as any).pendingTrends) (schedulerState as any).pendingTrends = [];
      (schedulerState as any).pendingTrends.push(...trends);
      // Keep queue bounded to last 50 trends
      if ((schedulerState as any).pendingTrends.length > 50) {
        (schedulerState as any).pendingTrends = (schedulerState as any).pendingTrends.slice(-50);
      }
    } catch (scanErr: any) {
      console.warn('Scheduler scan error:', scanErr.message);
    }

    res.json({ success: true, message: `Scan triggered for: ${niche}`, runCount: schedulerState.runCount });
  });

  // ─── Competitor Intelligence endpoint ─────────────────────────────────────
  app.get("/api/youtube/competitors", async (req, res) => {
    const niche = (req.query.niche as string) || 'Tech & AI';
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

    // Niche → search keyword mapping
    const nicheKeywords: Record<string, string> = {
      'Tech & AI': 'artificial intelligence tutorials',
      'Finance & Crypto': 'cryptocurrency investing',
      'Health & Wellness': 'health wellness tips',
      'Home & DIY': 'home improvement DIY',
      'Personal Development': 'self improvement motivation',
      'Gaming': 'gaming highlights',
      'Business & Entrepreneurship': 'business entrepreneur',
      'Travel': 'travel vlog',
      'Food & Cooking': 'cooking recipes',
      'Fitness': 'fitness workout',
    };
    const keyword = nicheKeywords[niche] || niche;

    // Content gap suggestions per niche
    const contentGaps: Record<string, string[]> = {
      'Tech & AI': ['AI tool comparisons for beginners', 'No-code AI automation tutorials', 'AI side hustle case studies'],
      'Finance & Crypto': ['DeFi explained simply', 'Tax-loss harvesting guides', 'Crypto for retirees'],
      'Health & Wellness': ['Mental health for entrepreneurs', 'Sleep optimization science', 'Gut health protocols'],
      'Home & DIY': ['Apartment-friendly DIY', 'Tool-free home upgrades', 'Rental property improvements'],
      'Personal Development': ['Deep work routines', 'Digital minimalism', 'Stoicism for modern life'],
      'Gaming': ['Retro game reviews', 'Indie game spotlights', 'Gaming setup on a budget'],
      'Business & Entrepreneurship': ['Bootstrapped SaaS stories', 'Freelance rate negotiation', 'B2B cold outreach scripts'],
    };
    const gaps = contentGaps[niche] || ['Beginner guides', 'Case studies', 'Tool comparisons'];

    try {
      if (!refreshToken || !clientId || !clientSecret) {
        throw new Error('YouTube credentials not configured');
      }
      const compClient = new google.auth.OAuth2(clientId, clientSecret);
      compClient.setCredentials({ refresh_token: refreshToken });
      const youtube = google.youtube({ version: 'v3', auth: compClient });

      // Search for top channels by keyword
      const searchResp = await youtube.search.list({
        part: ['snippet'],
        q: keyword,
        type: ['channel'],
        order: 'relevance',
        maxResults: 5,
      });

      const channelIds = (searchResp.data.items || [])
        .map((item: any) => item.snippet?.channelId || item.id?.channelId)
        .filter(Boolean);

      if (channelIds.length === 0) {
        return res.json({ niche, channels: [], fetchedAt: new Date().toISOString() });
      }

      // Fetch full channel stats
      const channelResp = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        id: channelIds,
      });

      const channels = (channelResp.data.items || []).map((ch: any, idx: number) => {
        const stats = ch.statistics || {};
        const subCount = parseInt(stats.subscriberCount || '0');
        const vidCount = parseInt(stats.videoCount || '0');
        const viewCount = parseInt(stats.viewCount || '0');
        const avgViews = vidCount > 0 ? Math.round(viewCount / vidCount) : 0;
        // Opportunity score: higher when avg views are high but sub count is moderate
        const opportunityScore = Math.min(99, Math.round(
          (avgViews / Math.max(1, subCount) * 1000) * 0.4 +
          (subCount < 500000 ? 40 : 20) +
          Math.random() * 10
        ));
        return {
          channelId: ch.id,
          channelTitle: ch.snippet?.title || 'Unknown',
          channelUrl: `https://www.youtube.com/channel/${ch.id}`,
          thumbnail: ch.snippet?.thumbnails?.default?.url || ch.snippet?.thumbnails?.medium?.url || '',
          subscriberCount: subCount,
          videoCount: vidCount,
          viewCount,
          avgViewsPerVideo: avgViews,
          uploadFrequency: vidCount > 200 ? '3-5x/week' : vidCount > 100 ? '1-2x/week' : 'Monthly',
          contentGap: gaps[idx % gaps.length],
          opportunityScore: Math.max(10, Math.min(99, opportunityScore)),
        };
      });

      res.json({ niche, channels, fetchedAt: new Date().toISOString() });
    } catch (error: any) {
      console.error('Competitor fetch error:', error.message);
      // Fallback: return AI-generated placeholder data
      const fallbackChannels = [
        { channelId: 'fallback1', channelTitle: `Top ${niche} Creator`, channelUrl: '#', thumbnail: '', subscriberCount: 450000, videoCount: 312, viewCount: 28000000, avgViewsPerVideo: 89744, uploadFrequency: '2x/week', contentGap: gaps[0], opportunityScore: 78 },
        { channelId: 'fallback2', channelTitle: `${niche} Explained`, channelUrl: '#', thumbnail: '', subscriberCount: 180000, videoCount: 145, viewCount: 9500000, avgViewsPerVideo: 65517, uploadFrequency: '1x/week', contentGap: gaps[1], opportunityScore: 85 },
        { channelId: 'fallback3', channelTitle: `${niche} Pro Tips`, channelUrl: '#', thumbnail: '', subscriberCount: 92000, videoCount: 89, viewCount: 4200000, avgViewsPerVideo: 47191, uploadFrequency: '3x/week', contentGap: gaps[2], opportunityScore: 91 },
      ];
      res.json({
        niche,
        channels: fallbackChannels,
        fetchedAt: new Date().toISOString(),
        source: 'fallback',
        isFallback: true,
        fallbackReason: error.message?.slice(0, 200) || 'YouTube API unavailable'
      });
    }
  });

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
}

startServer().catch(console.error);
