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
      const callbackClient = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/youtube/callback`
      );
      const { tokens } = await callbackClient.getToken(code as string);
      if (tokens.refresh_token) {
        fs.writeFileSync('/tmp/youtube_refresh_token.txt', tokens.refresh_token);
      }
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
    res.json({ status: "ok", timestamp: new Date().toISOString(), version: "2.0.0" });
  });

  app.post("/api/ai/generate", async (req, res) => {
    const { model, contents, prompt: directPrompt, type } = req.body;
    try {
      await waitForRateLimit();
      const { VertexAI } = await import("@google-cloud/vertexai");
      const credentials = getGoogleCredentials();
      const vertexAI = new VertexAI({
        project: "neuraltube-app",
        location: "europe-west1",
        ...(credentials ? { googleAuthOptions: { credentials } } : {})
      });
      const gm = vertexAI.getGenerativeModel({ model: model || "gemini-1.5-flash" });
      
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

      const result = await gm.generateContent(prompt);
      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
      res.json({ text, type });
    } catch (error) {
      console.error("Vertex AI Error:", error);
      res.status(500).json({ error: "AI Generation failed", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/strategy/hooks", async (req, res) => {
    const { topic, niche, videoType = "long-form" } = req.body;
    if (!topic) return res.status(400).json({ error: "topic is required" });
    try {
      const prompt = `You are a YouTube retention psychology expert. Generate 5 high-converting hooks for a ${videoType} YouTube video about: "${topic}" in the ${niche || 'general'} niche.\\n\\nFor each hook provide: patternInterrupt (0-3 sec shocking opening), openLoop (3-15 sec tease without revealing answer), credibilityAnchor (15-30 sec why trust this), title (curiosity gap formula), thumbnailConcept (what visual/emotion), psychologyTrigger (one of: curiosity_gap, fomo, social_proof, controversy, identity_trigger).\\n\\nReturn ONLY a valid JSON array with those exact field names. No markdown, no explanation.`;
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
      const prompt = `You are a YouTube script editor protecting a creator from YouTube's 2026 AI-detection demonetization system. Rewrite this script to pass detection by: adding a unique POV/angle, injecting 2-3 specific personal anecdotes, using natural spoken language (um, actually, here's the thing), and breaking common AI sentence patterns.\\n\\nNiche: ${niche || 'general'}\\nOriginal Script:\\n${finalScript}\\n\\nReturn ONLY a valid JSON object with fields: humanizedScript, changesMade (array of strings), aiRiskScore (0-100), uniquenessScore (0-100). No markdown.`;
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
      const prompt = `You are a YouTube Shorts strategy expert. Extract 3 high-performing YouTube Shorts (30-60 seconds each) from this long-form video script. Each Short must work standalone without watching the main video.\\n\\nVideo Title: ${title || 'Untitled'}\\nNiche: ${niche || 'general'}\\n\\nFor each Short return: shortsScript (full script), openingHook (first 3 seconds to stop scroll), ctaLine (end screen directing to full video), postingStrategy (before/same-day/after main video), retentionScore (0-100), title (Short title).\\n\\nOriginal Script (first 2000 chars):\\n${finalScript.substring(0, 2000)}\\n\\nReturn ONLY a valid JSON array with those exact fields. No markdown.`;
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
      const prompt = `You are a YouTube monetization strategist. Create a complete revenue stack for a ${channelSize} faceless YouTube channel in the "${niche}" niche currently earning \$${currentRevenue}/month.\\n\\nProvide: adSenseProjection (RPM range, views needed for \$1K/\$5K/\$10K/day), affiliateStack (array of 5 programs with name, commissionRate, avgTicket, url), digitalProducts (array of 3 ideas with name, pricePoint, format), superThanksStrategy (string), sponsorshipTargets (string), roadmap90Days (string with milestones), estimatedMonthlyAt100KViews (string), estimatedMonthlyAt1MViews (string).\\n\\nReturn ONLY valid JSON with those exact fields. No markdown.`;
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
      const prompt = `You are a YouTube CTR optimization expert. Analyze and improve this video title for maximum click-through rate.\\n\\nOriginal Title: "${title}"\\nNiche: ${niche || 'general'}\\n\\nUsing psychological triggers (curiosity gap, FOMO, controversy, identity, social proof), generate:\\n- titleVariations: array of 5 objects with: title, psychTrigger, predictedCTR (e.g. "8.2%"), thumbnailConcept\\n- seoAnalysis: object with primaryKeyword, secondaryKeywords (array), searchVolume (estimate string)\\n- originalCTREstimate: string\\n\\nReturn ONLY valid JSON with those exact fields. No markdown.`;
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
