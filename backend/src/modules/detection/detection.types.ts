export type DetectionConfidence =
  | "HIGH"
  | "MEDIUM"
  | "LOW";

export type DetectionEvidenceType =
  | "dependency"
  | "file"
  | "config"
  | "script"
  | "lockfile"
  | "package-field"
  | "source";

export type DetectionCategory =
  | "language"
  | "runtime"
  | "frontend"
  | "backend"
  | "database"
  | "build-tool"
  | "package-manager"
  | "architecture";

export type DetectedLanguage =
  | "JavaScript"
  | "TypeScript";

export type DetectedRuntime =
  | "Node.js";

export type DetectedFrontend =
  | "React";

export type DetectedBackend =
  | "Express";

export type DetectedDatabase =
  | "MongoDB";

export type DetectedBuildTool =
  | "Vite";

export type DetectedPackageManager =
  | "npm"
  | "Yarn"
  | "pnpm"
  | "Bun";

export interface DetectionEvidence {
  category: DetectionCategory;
  technology: string;
  source: string;
  detail: string;
  confidence: DetectionConfidence;
  evidenceType: DetectionEvidenceType;
}

export interface DetectionWarning {
  code: string;
  message: string;
}
export interface DetectedProjectUnit {
  rootPath: string;
  packageJsonPath: string;
}

export interface DetectionResult {
  projectUnits: DetectedProjectUnit[];

  language: DetectedLanguage | null;
  runtime: DetectedRuntime | null;
  frontend: DetectedFrontend | null;
  backend: DetectedBackend | null;
  database: DetectedDatabase | null;
  packageManager: DetectedPackageManager | null;
  buildTool: DetectedBuildTool | null;
  architecture: "MERN" | null;

  evidence: DetectionEvidence[];

  warnings: DetectionWarning[];


}
