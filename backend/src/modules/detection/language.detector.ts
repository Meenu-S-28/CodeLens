import path from "node:path";

import type {
  DetectionEvidence,
  DetectedLanguage,
} from "./detection.types.js";

import {
  JAVASCRIPT_EXTENSIONS,
  TYPESCRIPT_EXTENSIONS,
} from "./detection.constants.js";

import { repositoryInspector } from "./repository-inspector.service.js";

export interface LanguageDetection {
  language: DetectedLanguage | null;
  evidence: DetectionEvidence[];
  warnings: {
    code: string;
    message: string;
  }[];
}

export class LanguageDetector {
  async detect(
    projectId: string
  ): Promise<LanguageDetection> {
    const files =
      await repositoryInspector.findSourceFiles(
        projectId
      );

    let typescriptCount = 0;
    let javascriptCount = 0;

    for (const file of files) {
      const extension =
        path.extname(file.relativePath).toLowerCase();

      if (TYPESCRIPT_EXTENSIONS.has(extension)) {
        typescriptCount++;
      }

      if (JAVASCRIPT_EXTENSIONS.has(extension)) {
        javascriptCount++;
      }
    }

    const evidence: DetectionEvidence[] = [];
    const warnings: LanguageDetection["warnings"] =
      [];

    if (
      typescriptCount > 0 &&
      javascriptCount > 0
    ) {
      warnings.push({
        code: "MIXED_JS_TS",
        message:
          `Both JavaScript (${javascriptCount}) and TypeScript (${typescriptCount}) source files were detected.`,
      });
    }

    if (
      typescriptCount > 0 &&
      typescriptCount >= javascriptCount
    ) {
      evidence.push({
        category: "language",
        technology: "TypeScript",
        source: "repository",
        detail:
          `${typescriptCount} TypeScript source file(s) detected`,
        confidence:
          typescriptCount >=
          javascriptCount * 2
            ? "HIGH"
            : "MEDIUM",
        evidenceType: "source",
      });

      return {
        language: "TypeScript",
        evidence,
        warnings,
      };
    }

    if (javascriptCount > 0) {
      evidence.push({
        category: "language",
        technology: "JavaScript",
        source: "repository",
        detail:
          `${javascriptCount} JavaScript source file(s) detected`,
        confidence:
          javascriptCount >=
          typescriptCount * 2
            ? "HIGH"
            : "MEDIUM",
        evidenceType: "source",
      });

      return {
        language: "JavaScript",
        evidence,
        warnings,
      };
    }

    return {
      language: null,
      evidence: [],
      warnings,
    };
  }
}

export const languageDetector =
  new LanguageDetector();