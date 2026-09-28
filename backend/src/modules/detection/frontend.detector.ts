import type {
  DetectionEvidence,
  DetectedFrontend,
} from "./detection.types.js";

import type { ProjectUnit } from "./project-structure.analyzer.js";

import {
  getDependencySource,
  hasDependency,
} from "./package-utils.js";

export interface FrontendDetection {
  frontend: DetectedFrontend | null;
  evidence: DetectionEvidence[];
}

export class FrontendDetector {
  detect(
    units: ProjectUnit[]
  ): FrontendDetection {
    const evidence: DetectionEvidence[] = [];

    for (const unit of units) {
      const packageJson = unit.packageJson;

      if (hasDependency(packageJson, "react")) {
        const source = getDependencySource(
          packageJson,
          "react"
        );

        evidence.push({
          category: "frontend",
          technology: "React",
          source: unit.packageJsonPath,
          detail:
            `react detected in ${source ?? "package metadata"}`,
          confidence: "HIGH",
          evidenceType: "dependency",
        });
      }

      if (hasDependency(packageJson, "react-dom")) {
        evidence.push({
          category: "frontend",
          technology: "React",
          source: unit.packageJsonPath,
          detail:
            "react-dom dependency detected",
          confidence: "HIGH",
          evidenceType: "dependency",
        });
      }
    }

    return {
      frontend:
        evidence.length > 0
          ? "React"
          : null,
      evidence,
    };
  }
}

export const frontendDetector =
  new FrontendDetector();