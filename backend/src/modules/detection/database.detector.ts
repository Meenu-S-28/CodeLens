import type {
  DetectionEvidence,
  DetectedDatabase,
} from "./detection.types.js";

import type { ProjectUnit } from "./project-structure.analyzer.js";

import { hasDependency } from "./package-utils.js";

export interface DatabaseDetection {
  database: DetectedDatabase | null;
  evidence: DetectionEvidence[];
}

export class DatabaseDetector {
  detect(
    units: ProjectUnit[]
  ): DatabaseDetection {
    const evidence: DetectionEvidence[] = [];

    for (const unit of units) {
      const packageJson = unit.packageJson;

      if (hasDependency(packageJson, "mongoose")) {
        evidence.push({
          category: "database",
          technology: "MongoDB",
          source: unit.packageJsonPath,
          detail:
            "mongoose dependency detected; Mongoose is a MongoDB ODM",
          confidence: "HIGH",
          evidenceType: "dependency",
        });
      }

      if (hasDependency(packageJson, "mongodb")) {
        evidence.push({
          category: "database",
          technology: "MongoDB",
          source: unit.packageJsonPath,
          detail:
            "mongodb driver dependency detected",
          confidence: "HIGH",
          evidenceType: "dependency",
        });
      }
    }

    return {
      database:
        evidence.length > 0
          ? "MongoDB"
          : null,
      evidence,
    };
  }
}

export const databaseDetector =
  new DatabaseDetector();