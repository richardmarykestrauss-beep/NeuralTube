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
  // Strip markdown code fences if present
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find the first JSON object or array in the text
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    const match = arrMatch || objMatch;
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // Fall through to throw
      }
    }
    throw new Error(`Could not parse JSON from AI response: ${text.substring(0, 100)}`);
  }
}

// ─── Generate Video Script ────────────────────────────────────────────────────
export const generateVideoScript = async (topic: string, niche: string): Promise<GeneratedScript> => {
  const prompt = `You are a YouTube script writer. Generate a high-retention YouTube script for the topic: "${topic}" in the "${niche}" niche.
Focus on a viral hook (first 30 seconds), data-dense body, and strong CTA.

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
  const prompt = `Analyze the top 4 high-RPM YouTube niches for 2026. Provide saturation levels, opportunity scores, and specific content gaps.

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  {
    "name": "Personal Finance",
    "channels": 12000,
    "avgRPM": "$18.50",
    "saturation": 45,
    "opportunity": 82,
    "topGap": "Crypto tax strategies for beginners",
    "monthlyRev": "$8,000-25,000"
  }
]`;

  const text = await callAiProxy(prompt);
  return extractJSON(text) as NicheAnalysis[];
};

// ─── Scan For Trends ──────────────────────────────────────────────────────────
export const scanForTrends = async (niche: string): Promise<TrendScanResult[]> => {
  const prompt = `You are a YouTube trend analyst. Identify the top 3 trending, high-potential video topics in the "${niche}" niche right now in 2026.
Focus on topics with high search volume but low competition.

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  {
    "topic": "Exact video title idea here",
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

// ─── Generate Visuals Prompt ──────────────────────────────────────────────────
export const generateVisualsPrompt = async (script: string): Promise<string> => {
  const prompt = `Based on this YouTube script, generate a detailed list of B-roll scenes and visual instructions for a video editor.
Script: "${script.substring(0, 500)}"

Return a plain text list of visual instructions, one per line.`;

  return await callAiProxy(prompt);
};

// ─── Generate SEO Data ────────────────────────────────────────────────────────
export const generateSEOData = async (title: string, script: string): Promise<{ tags: string[], description: string }> => {
  const prompt = `Generate YouTube SEO optimization for a video titled: "${title}"
Script excerpt: "${script.substring(0, 300)}"

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "description": "Full YouTube video description here with keywords naturally embedded."
}`;

  const text = await callAiProxy(prompt);
  return extractJSON(text) as { tags: string[], description: string };
};
