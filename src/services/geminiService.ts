import { API_BASE_URL } from "../config/api";

export interface GeneratedScript {
  hook: string;
  body: string;
  outro: string;
  stats: {
    hookStrength: number;
    retentionPrediction: number;
    originality: number;
    wordCount: number;
    readingTime: string;
    ctrPrediction: number;
  };
}

export interface NicheAnalysis {
  name: string;
  channels: number;
  avgRPM: string;
  saturation: number;
  opportunity: number;
  topGap: string;
  monthlyRev: string;
}

export interface TrendScanResult {
  topic: string;
  score: number;
  volume: string;
  competition: string;
  potential: string;
  status: "hot" | "rising" | "stable";
}

// ─── Free Tier Quota Guard ────────────────────────────────────────────────────
// SerpAPI free tier: 100 searches/month. Scanning 2 niches per cycle = 50 cycles/month.
// We cap at 2 SerpAPI calls per scan session and track daily usage in localStorage.
const SERP_DAILY_CAP = 4; // max 4 SerpAPI calls per day (2 niches × 2 scans/day)
const SERP_STORAGE_KEY = "neuraltube_serp_usage";

function getSerpUsageToday(): number {
  try {
    const stored = localStorage.getItem(SERP_STORAGE_KEY);
    if (!stored) return 0;
    const { date, count } = JSON.parse(stored);
    const today = new Date().toISOString().split("T")[0];
    if (date !== today) return 0; // reset on new day
    return count || 0;
  } catch {
    return 0;
  }
}

function incrementSerpUsage(): void {
  try {
    const today = new Date().toISOString().split("T")[0];
    const current = getSerpUsageToday();
    localStorage.setItem(SERP_STORAGE_KEY, JSON.stringify({ date: today, count: current + 1 }));
  } catch { /* ignore storage errors */ }
}

function serpQuotaAvailable(): boolean {
  return getSerpUsageToday() < SERP_DAILY_CAP;
}

// ─── Core AI proxy call ───────────────────────────────────────────────────────
const callAiProxy = async (prompt: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/api/ai/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.details || error.error || "AI Proxy call failed");
  }

  const data = await response.json();
  return data.text || "";
};

// ─── Safe JSON extractor ──────────────────────────────────────────────────────
function extractJSON(text: string): any {
  let cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try { return JSON.parse(cleaned); } catch { /* continue */ }

  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]); } catch { /* continue */ }
  }

  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch { /* continue */ }
  }

  try {
    const fixed = cleaned
      .replace(/,\s*([\]\}])/g, '$1')
      .replace(/([\{,]\s*)(\w+)\s*:/g, '$1"$2":');
    return JSON.parse(fixed);
  } catch { /* continue */ }

  throw new Error(`Could not parse JSON from AI response: ${text.substring(0, 100)}`);
}

// ─── Generate Video Script (OPTIMISED — human-sounding, AI-detection resistant) ─
export const generateVideoScript = async (topic: string, niche: string): Promise<GeneratedScript> => {
  const prompt = `You are an elite YouTube scriptwriter who has written for channels with 10M+ subscribers. Your scripts sound 100% human — never robotic, never generic.

Write a high-retention YouTube script for the topic: "${topic}" in the "${niche}" niche.

MANDATORY RULES:
1. HOOK (0-30 seconds): Start with a shocking statistic, a bold contrarian claim, or a "what if" scenario. NEVER open with "Welcome back" or "In today's video."
2. BODY: Use the "Open Loop" framework — introduce a problem, delay the full solution, and deliver it in 3 clear steps with specific data points or real-world examples.
3. OUTRO (30 seconds): End with a single, specific CTA (e.g., "Click the link in the description to get the free [topic] blueprint").
4. TONE: Conversational, slightly opinionated, and direct. Use natural speech patterns like "Here's the thing," "Look," "To be honest," and "And here's what nobody tells you."
5. BANNED PHRASES: NEVER use "In today's fast-paced world," "Let's dive in," "Crucial," "Tapestry," "Delve," "Leverage," "Unlock your potential," or "Game-changer."
6. LENGTH: Aim for 1,000–1,400 words total (approximately 7–9 minutes of spoken content).

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "hook": "opening 30-second script text",
  "body": "main script body text",
  "outro": "closing CTA text",
  "stats": {
    "hookStrength": 85,
    "retentionPrediction": 72,
    "originality": 80,
    "wordCount": 1200,
    "readingTime": "8 min",
    "ctrPrediction": 6
  }
}`;

  const text = await callAiProxy(prompt);
  return extractJSON(text) as GeneratedScript;
};

// ─── Analyze Niches ───────────────────────────────────────────────────────────
export const analyzeNiches = async (): Promise<NicheAnalysis[]> => {
  const prompt = `You are a YouTube channel monetization strategist. Analyze the top 4 highest-RPM, lowest-competition YouTube niches for a faceless AI-generated channel in 2026.

Focus on niches where:
- RPM is above $10
- Competition is Low or Ultra-Low
- Content can be produced without showing a face or using copyrighted material
- There is a clear, underserved content gap

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  {
    "name": "Niche Name",
    "channels": 12000,
    "avgRPM": "$18.50",
    "saturation": 45,
    "opportunity": 82,
    "topGap": "Specific underserved topic within this niche",
    "monthlyRev": "$8,000-25,000"
  }
]`;

  const text = await callAiProxy(prompt);
  return extractJSON(text) as NicheAnalysis[];
};

// ─── Scan For Trends (SerpAPI with daily quota guard + Gemini fallback) ───────
export const scanForTrends = async (niche: string): Promise<TrendScanResult[]> => {
  // Only call SerpAPI if daily quota is available
  if (serpQuotaAvailable()) {
    try {
      const serpRes = await fetch(`${API_BASE_URL}/api/trends/serp?niche=${encodeURIComponent(niche)}`);
      if (serpRes.ok) {
        const serpData = await serpRes.json();
        if (Array.isArray(serpData.trends) && serpData.trends.length > 0) {
          incrementSerpUsage();
          return serpData.trends as TrendScanResult[];
        }
      }
    } catch {
      // SerpAPI unavailable — fall through to Gemini
    }
  }

  // Fallback: Gemini AI trend generation (optimised prompt)
  const prompt = `You are a YouTube trend analyst with access to real-time search data. Identify the top 3 trending, high-potential video topics in the "${niche}" niche right now in April 2026.

CRITERIA:
- Topics must have high search intent (people are actively searching for answers)
- Low competition (fewer than 50 well-optimised videos on this exact topic)
- Evergreen potential (will still be relevant in 6 months)
- Suitable for a faceless, AI-narrated YouTube channel

For each topic, provide a specific, clickable video title — not a vague category.

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  {
    "topic": "Specific, clickable video title here",
    "score": 94,
    "volume": "2.4M",
    "competition": "Low",
    "potential": "Very High",
    "status": "hot"
  }
]

status must be one of: "hot", "rising", or "stable"`;

  const text = await callAiProxy(prompt);
  return extractJSON(text) as TrendScanResult[];
};

// ─── Generate Visuals Prompt (OPTIMISED — specific B-roll keywords for Pexels) ─
export const generateVisualsPrompt = async (script: string): Promise<string[]> => {
  const prompt = `You are a video editor creating a B-roll shot list for a YouTube video. Based on this script excerpt, generate 5 specific, searchable Pexels stock footage keywords.

Script: "${script.substring(0, 600)}"

RULES:
- Each keyword must be 2-4 words (e.g., "person counting money", "city skyline night", "laptop screen coding")
- Keywords must be visually concrete — no abstract concepts
- Each keyword should represent a different scene to maintain visual variety

Return ONLY a valid JSON array of 5 strings. No markdown, no explanation.
Example: ["person counting money", "stock market chart", "businessman walking city", "laptop screen data", "bank vault door"]`;

  const text = await callAiProxy(prompt);
  try {
    return extractJSON(text) as string[];
  } catch {
    // Fallback: split plain text lines
    return text.split("\n").filter(l => l.trim()).slice(0, 5);
  }
};

// ─── Generate SEO Data (OPTIMISED — lead gen focused, long-tail keywords) ─────
export const generateSEOData = async (title: string, script: string): Promise<{ tags: string[], description: string }> => {
  const prompt = `You are a YouTube SEO and Lead Generation expert. Create optimised metadata for a video titled: "${title}"

Script excerpt: "${script.substring(0, 400)}"

MANDATORY RULES:
1. DESCRIPTION STRUCTURE:
   - Line 1-2: Hook the viewer with the video's core promise. Include the primary keyword naturally.
   - Line 3: Lead Gen CTA — "Get the free [topic] guide here: [LINK_PLACEHOLDER]"
   - Lines 4-8: 4-5 chapter timestamps in format "00:00 - Chapter Title"
   - Lines 9-12: 3-4 secondary keywords embedded naturally in a short paragraph.
2. TAGS: Use 7 highly specific long-tail keyword phrases (3-6 words each). Avoid single generic words.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "tags": ["specific long tail keyword 1", "specific long tail keyword 2", "specific long tail keyword 3", "specific long tail keyword 4", "specific long tail keyword 5", "specific long tail keyword 6", "specific long tail keyword 7"],
  "description": "Full YouTube video description including hook, lead gen CTA with [LINK_PLACEHOLDER], timestamps, and keyword paragraph."
}`;

  const text = await callAiProxy(prompt);
  return extractJSON(text) as { tags: string[], description: string };
};

// ─── Export quota status for UI display ──────────────────────────────────────
export const getSerpQuotaStatus = (): { used: number; cap: number; available: boolean } => ({
  used: getSerpUsageToday(),
  cap: SERP_DAILY_CAP,
  available: serpQuotaAvailable()
});
