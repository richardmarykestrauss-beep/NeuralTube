import { GoogleGenAI, Type } from "@google/genai";

let genAI: GoogleGenAI | null = null;

const getGenAI = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
};

export interface AuditIssue {
  file: string;
  type: "security" | "performance" | "logic" | "style";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  suggestion: string;
  line?: number;
}

export interface AuditResult {
  score: number;
  summary: string;
  issues: AuditIssue[];
}

export const auditCodebase = async (files: { path: string; content: string }[]): Promise<AuditResult> => {
  const ai = getGenAI();
  
  const codebaseContext = files.map(f => `File: ${f.path}\nContent:\n${f.content}`).join("\n\n---\n\n");

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [{ 
      role: "user", 
      parts: [{ 
        text: `You are an expert AI Code Auditor. Analyze the following codebase for security vulnerabilities, performance bottlenecks, logic errors, and style inconsistencies.
        
        ${codebaseContext}
        
        Return your analysis as a JSON object matching this schema:
        {
          "score": number (0-100),
          "summary": string,
          "issues": [
            {
              "file": string,
              "type": "security" | "performance" | "logic" | "style",
              "severity": "low" | "medium" | "high" | "critical",
              "description": string,
              "suggestion": string,
              "line": number (optional)
            }
          ]
        }` 
      }] 
    }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          issues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                file: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["security", "performance", "logic", "style"] },
                severity: { type: Type.STRING, enum: ["low", "medium", "high", "critical"] },
                description: { type: Type.STRING },
                suggestion: { type: Type.STRING },
                line: { type: Type.NUMBER },
              },
              required: ["file", "type", "severity", "description", "suggestion"],
            },
          },
        },
        required: ["score", "summary", "issues"],
      },
    },
  });

  return JSON.parse(response.text);
};
