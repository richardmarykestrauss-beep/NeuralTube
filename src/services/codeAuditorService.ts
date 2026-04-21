import { API_BASE_URL } from "@/config/api";
import { auth } from "@/firebase";

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
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in to run a code audit.");
  const idToken = await user.getIdToken();
  const response = await fetch(`${API_BASE_URL}/api/codebase/audit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify({ files }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Audit request failed with status ${response.status}`);
  }
  return response.json() as Promise<AuditResult>;
};
