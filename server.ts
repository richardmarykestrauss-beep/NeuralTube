import cron from 'node-cron';
import fs from "fs";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import axios from "axios";
import { exec } from "child_process";
import { sify } from "util";

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

// ─── Vertex AI helper (Native Gemini) ───────────────────
async function callStrategyAI(prompt: string): Promise<string> {
  try {
    const { VertexAI } = await import("@google-cloud/vertexai");
    const credentials = getGoogleCredentials();
    const vertexAI = new VertexAI({
      project: "neuraltube-app",
      location: "europe-west1",
      ...(credentials ? { googleAuthOptions: { credentials } } : {})
    });
    // Use gemini-1.5-flash-002 for the specific region
    const model = vertexAI.getGenerativeModel({ model: "gemini-1.5-flash-002" });
    const result = await model.generateContent(prompt);
    return result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error: any) {
    console.error("Vertex AI call failed:", error);
    throw new Error(`Vertex AI Error: ${error.message || "Unknown error"}`);
  }
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000");

  app.use((req, res, next) => {
    const allowedOrigins = [
      'https://neural-tube.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin )) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', 'https://neural-tube.vercel.app' );
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/strategy/hooks", async (req, res) => {
    try {
      const { topic } = req.body;
      const prompt = `Generate 5 viral YouTube hook ideas for a video about: "${topic}". Return as JSON.`;
      const result = await callStrategyAI(prompt);
      res.json({ hooks: result });
    } catch (error: any) {
      res.status(500).json({ error: "Hook generation failed", details: error.message });
    }
  });

  app.post("/api/strategy/humanize", async (req, res) => {
    try {
      const { script } = req.body;
      const prompt = `Rewrite this script to sound more human and conversational: "${script}"`;
      const result = await callStrategyAI(prompt);
      res.json({ humanized: result });
    } catch (error: any) {
      res.status(500).json({ error: "Humanization failed", details: error.message });
    }
  });

  app.post("/api/strategy/shorts", async (req, res) => {
    try {
      const { topic } = req.body;
      const prompt = `Create a 60-second YouTube Shorts script outline for: "${topic}". Include visual cues and narration.`;
      const result = await callStrategyAI(prompt);
      res.json({ script: result });
    } catch (error: any) {
      res.status(500).json({ error: "Shorts extraction failed", details: error.message });
    }
  });

  app.post("/api/strategy/monetize", async (req, res) => {
    const { niche } = req.body;
    if (!niche) return res.status(400).json({ error: "niche is required" });
    try {
      const prompt = `Suggest 5 monetization strategies for a YouTube channel in the ${niche} niche. Return as JSON.`;
      const text = await callStrategyAI(prompt);
      const cleanText = text.replace(/`json\n?/g, '').replace(/`/g, '').trim();
      res.json(JSON.parse(cleanText));
    } catch (error: any) {
      res.status(500).json({ error: "Monetization analysis failed", details: error.message });
    }
  });

  app.post("/api/strategy/optimize-title", async (req, res) => {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });
    try {
      const prompt = `Optimize this YouTube title for CTR: "${title}". Return 5 variations in JSON.`;
      const text = await callStrategyAI(prompt);
      const cleanText = text.replace(/`json\n?/g, '').replace(/`/g, '').trim();
      res.json(JSON.parse(cleanText));
    } catch (error: any) {
      res.status(500).json({ error: "Title optimization failed", details: error.message });
    }
  });

  const PORT_FINAL = process.env.PORT || 8080;
  app.listen(PORT_FINAL, () => {
    console.log(`Server running on port ${PORT_FINAL}`);
  });
}

startServer().catch(console.error);

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

// ─── Vertex AI helper (Native Gemini) ───────────────────
async function callStrategyAI(prompt: string): Promise<string> {
  try {
    const { VertexAI } = await import("@google-cloud/vertexai");
    const credentials = getGoogleCredentials();
    const vertexAI = new VertexAI({
      project: "neuraltube-app",
      location: "europe-west1",
      ...(credentials ? { googleAuthOptions: { credentials } } : {})
    });
    // Use gemini-1.5-flash as requested for better availability
    const model = vertexAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error: any) {
    console.error("Vertex AI call failed:", error);
    throw new Error(`Vertex AI Error: ${error.message || "Unknown error"}`);
  }
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000");

  app.use((req, res, next) => {
    const allowedOrigins = [
      'https://neural-tube.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin )) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', 'https://neural-tube.vercel.app' );
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), version: "2.1.0" });
  });

  app.post("/api/strategy/hooks", async (req, res) => {
    const { topic, niche, videoType = "long-form" } = req.body;
    if (!topic) return res.status(400).json({ error: "topic is required" });
    try {
      const prompt = `You are a YouTube retention psychology expert. Generate 5 high-converting hooks for a ${videoType} YouTube video about: "${topic}" in the ${niche || 'general'} niche.\n\nFor each hook provide: patternInterrupt, openLoop, credibilityAnchor, title, thumbnailConcept, psychologyTrigger.\n\nReturn ONLY a valid JSON array.`;
      const text = await callStrategyAI(prompt);
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      res.json({ hooks: JSON.parse(cleanText), topic, niche });
    } catch (error: any) {
      res.status(500).json({ error: "Hook generation failed", details: error.message });
    }
  });

  app.post("/api/strategy/humanize", async (req, res) => {
    const { script, niche } = req.body;
    if (!script) return res.status(400).json({ error: "script is required" });
    try {
      const prompt = `Rewrite this YouTube script to be more human and engaging. Niche: ${niche || 'general'}. Script: ${script.substring(0, 2000)}`;
      const text = await callStrategyAI(prompt);
      res.json({ humanizedScript: text });
    } catch (error: any) {
      res.status(500).json({ error: "Humanization failed", details: error.message });
    }
  });

  app.post("/api/strategy/shorts", async (req, res) => {
    const { script, title } = req.body;
    if (!script) return res.status(400).json({ error: "script is required" });
    try {
      const prompt = `Extract 3 viral YouTube Shorts scripts from this content: ${script.substring(0, 2000)}`;
      const text = await callStrategyAI(prompt);
      res.json({ shorts: text });
    } catch (error: any) {
      res.status(500).json({ error: "Shorts extraction failed", details: error.message });
    }
  });

  app.post("/api/strategy/monetize", async (req, res) => {
    const { niche } = req.body;
    if (!niche) return res.status(400).json({ error: "niche is required" });
    try {
      const prompt = `Suggest 5 monetization strategies for a YouTube channel in the ${niche} niche. Return as JSON.`;
      const text = await callStrategyAI(prompt);
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      res.json(JSON.parse(cleanText));
    } catch (error: any) {
      res.status(500).json({ error: "Monetization analysis failed", details: error.message });
    }
  });

  app.post("/api/strategy/optimize-title", async (req, res) => {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });
    try {
      const prompt = `Optimize this YouTube title for CTR: "${title}". Return 5 variations in JSON.`;
      const text = await callStrategyAI(prompt);
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      res.json(JSON.parse(cleanText));
    } catch (error: any) {
      res.status(500).json({ error: "Title optimization failed", details: error.message });
    }
  });

  const PORT_FINAL = process.env.PORT || 8080;
  app.listen(PORT_FINAL, () => {
    console.log(`Server running on port ${PORT_FINAL}`);
  });
}

startServer().catch(console.error);
