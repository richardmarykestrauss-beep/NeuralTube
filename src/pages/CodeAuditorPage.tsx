import { API_BASE_URL } from "../config/api";
import React, { useState } from "react";
import { Shield, Zap, Code, AlertTriangle, CheckCircle2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { auditCodebase, AuditResult, AuditIssue } from "@/services/codeAuditorService";
import { toast } from "sonner";

export default function CodeAuditorPage() {
  const [isAuditing, setIsAuditing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);

  const runAudit = async () => {
    setIsAuditing(true);
    setResult(null);
    try {
      // 1. Fetch codebase files from our API
      const response = await fetch(`${API_BASE_URL}/api/codebase/files`);
      if (!response.ok) throw new Error("Failed to fetch codebase files");
      const files = await response.json();

      // 2. Run AI Audit
      const auditResult = await auditCodebase(files);
      setResult(auditResult);
      toast.success("Codebase audit complete!");
    } catch (error) {
      console.error("Audit failed:", error);
      toast.error("Failed to audit codebase. Check console for details.");
    } finally {
      setIsAuditing(false);
    }
  };

  const getSeverityColor = (severity: AuditIssue["severity"]) => {
    switch (severity) {
      case "critical": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-black";
      case "low": return "bg-blue-500 text-white";
      default: return "bg-gray-500";
    }
  };

  const getTypeIcon = (type: AuditIssue["type"]) => {
    switch (type) {
      case "security": return <Shield className="w-4 h-4" />;
      case "performance": return <Zap className="w-4 h-4" />;
      case "logic": return <AlertTriangle className="w-4 h-4" />;
      case "style": return <Code className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">AI Code Auditor</h1>
          <p className="text-muted-foreground mt-2">Deep scan your codebase for security, logic, and performance issues.</p>
        </div>
        <Button 
          size="lg" 
          onClick={runAudit} 
          disabled={isAuditing}
          className="bg-primary hover:bg-primary/90"
        >
          {isAuditing ? (
            <>
              <Loader2 className="mr-2 h-4 h-4 animate-spin" />
              Auditing Codebase...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 h-4" />
              Start Full Audit
            </>
          )}
        </Button>
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Health Score</CardTitle>
              <CardDescription>Overall codebase quality metric</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-4">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-muted/20"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={364.4}
                    strokeDashoffset={364.4 * (1 - result.score / 100)}
                    className={result.score > 80 ? "text-green-500" : result.score > 50 ? "text-yellow-500" : "text-red-500"}
                  />
                </svg>
                <span className="absolute text-3xl font-bold">{result.score}%</span>
              </div>
              <p className="text-center text-sm text-muted-foreground">{result.summary}</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Audit Findings</CardTitle>
              <CardDescription>Identified issues and suggested improvements</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {result.issues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                      <h3 className="text-lg font-semibold">No issues found!</h3>
                      <p className="text-muted-foreground">Your codebase looks clean and secure.</p>
                    </div>
                  ) : (
                    result.issues.map((issue, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3 bg-card/50">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="flex items-center gap-1">
                              {getTypeIcon(issue.type)}
                              {issue.type.toUpperCase()}
                            </Badge>
                            <Badge className={getSeverityColor(issue.severity)}>
                              {issue.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">
                            {issue.file}{issue.line ? `:${issue.line}` : ""}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{issue.description}</p>
                          <p className="text-sm text-muted-foreground mt-1 bg-muted/50 p-2 rounded border-l-2 border-primary">
                            <span className="font-semibold">Suggestion:</span> {issue.suggestion}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {!result && !isAuditing && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-muted/5">
          <Code className="w-16 h-16 text-muted mb-4" />
          <h2 className="text-xl font-semibold">Ready for Audit</h2>
          <p className="text-muted-foreground max-w-md text-center mt-2">
            Click the button above to start a deep AI scan of your application's source code.
          </p>
        </div>
      )}
    </div>
  );
}
