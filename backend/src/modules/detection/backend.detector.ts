import type {
  DetectionEvidence,
  DetectedBackend,
} from "./detection.types.js";

import type { ProjectUnit } from "./project-structure.analyzer.js";

import {
  getDependencySource,
  hasDependency,
} from "./package-utils.js";

export interface BackendDetection {
  backend: DetectedBackend | null;
  evidence: DetectionEvidence[];
}

export class BackendDetector {
  detect(
    units: ProjectUnit[]
  ): BackendDetection {
    const evidence: DetectionEvidence[] = [];

    for (const unit of units) {
      const packageJson = unit.packageJson;

      if (!hasDependency(packageJson, "express")) {
        continue;
      }

      const source = getDependencySource(
        packageJson,
        "express"
      );

      evidence.push({
        category: "backend",
        technology: "Express",
        source: unit.packageJsonPath,
        detail:
          `express detected in ${source ?? "package metadata"}`,
        confidence: "HIGH",
        evidenceType: "dependency",
      });
    }

    return {
      backend:
        evidence.length > 0
          ? "Express"
          : null,
      evidence,
    };
  }
}

export const backendDetector =
  new BackendDetector();