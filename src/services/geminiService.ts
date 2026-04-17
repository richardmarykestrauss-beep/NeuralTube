import { Type } from "@google/genai";

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

import { API_BASE_URL } from "../config/api";

const callAiProxy = async (model: string, contents: { role: string; parts: { text: string }[] }[], config?: Record<string, unknown>) => {
  const response = await fetch(`${API_BASE_URL}/api/ai/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, contents, config })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || "AI Proxy call failed");
  }
  
  return await response.json();
};

export const generateVideoScript = async (topic: string, niche: string): Promise<GeneratedScript> => {
  const result = await callAiProxy("gemini-3-flash-preview", 
    [{ role: "user", parts: [{ text: `Generate a high-retention YouTube script for the topic: "${topic}" in the "${niche}" niche. 
    Focus on a viral hook, data-dense body, and strong CTA. 
    Also provide predicted performance metrics.` }] }],
    {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hook: { type: Type.STRING },
          body: { type: Type.STRING },
          outro: { type: Type.STRING },
          stats: {
            type: Type.OBJECT,
            properties: {
              hookStrength: { type: Type.NUMBER },
              retentionPrediction: { type: Type.NUMBER },
              originality: { type: Type.NUMBER },
              wordCount: { type: Type.NUMBER },
              readingTime: { type: Type.STRING },
              ctrPrediction: { type: Type.NUMBER },
            },
            required: ["hookStrength", "retentionPrediction", "originality", "wordCount", "readingTime", "ctrPrediction"],
          },
        },
        required: ["hook", "body", "outro", "stats"],
      },
    }
  );

  return JSON.parse(result.text);
};

export const analyzeNiches = async (): Promise<NicheAnalysis[]> => {
  const result = await callAiProxy("gemini-3-flash-preview",
    [{ role: "user", parts: [{ text: "Analyze the current top 4 high-RPM YouTube niches for 2026. Provide saturation levels, opportunity scores, and specific content gaps." }] }],
    {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            channels: { type: Type.NUMBER },
            avgRPM: { type: Type.STRING },
            saturation: { type: Type.NUMBER },
            opportunity: { type: Type.NUMBER },
            topGap: { type: Type.STRING },
            monthlyRev: { type: Type.STRING },
          },
          required: ["name", "channels", "avgRPM", "saturation", "opportunity", "topGap", "monthlyRev"],
        },
      },
    }
  );

  return JSON.parse(result.text);
};

export const scanForTrends = async (niche: string): Promise<TrendScanResult[]> => {
  const result = await callAiProxy("gemini-3-flash-preview",
    [{ role: "user", parts: [{ text: `Scan for the top 3 trending, high-potential video topics in the "${niche}" niche right now. 
    Focus on topics with high search volume but low competition.` }] }],
    {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            score: { type: Type.NUMBER },
            volume: { type: Type.STRING },
            competition: { type: Type.STRING },
            potential: { type: Type.STRING },
            status: { type: Type.STRING, enum: ["hot", "rising", "stable"] },
          },
          required: ["topic", "score", "volume", "competition", "potential", "status"],
        },
      },
    }
  );

  return JSON.parse(result.text);
};

export const generateVisualsPrompt = async (script: string): Promise<string> => {
  const result = await callAiProxy("gemini-3-flash-preview",
    [{ role: "user", parts: [{ text: `Based on this script, generate a detailed list of B-roll scenes and visual instructions for an AI video generator: "${script}"` }] }]
  );
  return result.text;
};

export const generateSEOData = async (title: string, script: string): Promise<{ tags: string[], description: string }> => {
  const result = await callAiProxy("gemini-3-flash-preview",
    [{ role: "user", parts: [{ text: `Generate YouTube SEO tags and a description for a video titled "${title}" with this script: "${script}". Return as JSON.` }] }],
    {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          description: { type: Type.STRING },
        },
        required: ["tags", "description"],
      },
    }
  );
  return JSON.parse(result.text);
};
