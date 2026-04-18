export interface AnalyzedClause {
  title: string;
  content: string;
  riskLevel: "high" | "warning" | "safe";
  analysis: string;
  relatedLaw: string;
}

export interface MissingClause {
  title: string;
  importance: "high" | "medium";
  description: string;
}

export interface AnalysisResult {
  clauses: AnalyzedClause[];
  missingClauses: MissingClause[];
  safetyScore: number;
  aiOpinion: string;
}

export interface SampleContract {
  id: string;
  label: string;
  description: string;
  text: string;
}

export type InputMode = "text" | "file";
