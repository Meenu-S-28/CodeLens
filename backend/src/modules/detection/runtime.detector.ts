import type {
  DetectionEvidence,
  DetectedRuntime,
} from "./detection.types.js";

import type { ProjectUnit } from "./project-structure.analyzer.js";

import { hasDependency } from "./package-utils.js";

export interface RuntimeDetection {
  runtime: DetectedRuntime | null;
  evidence: DetectionEvidence[];
}

export class RuntimeDetector {
  detect(
    units: ProjectUnit[]
  ): RuntimeDetection {
    const evidence: DetectionEvidence[] = [];

    for (const unit of units) {
      const packageJson = unit.packageJson;

      if (packageJson.engines?.node) {
        evidence.push({
          category: "runtime",
          technology: "Node.js",
          source: unit.packageJsonPath,
          detail:
            `Node.js engine requirement declared: ${packageJson.engines.node}`,
          confidence: "HIGH",
          evidenceType: "package-field",
        });
      }

      const scripts = Object.values(
        packageJson.scripts ?? {}
      );

      const nodeScript = scripts.find(
        (script) =>
          /\bnode(?:\.js)?\b/.test(script) ||
          /\btsx\b/.test(script) ||
          /\bts-node\b/.test(script) ||
          /\bnodemon\b/.test(script)
      );

      if (nodeScript) {
        evidence.push({
          category: "runtime",
          technology: "Node.js",
          source: unit.packageJsonPath,
          detail:
            "Node.js-compatible runtime command detected in package scripts",
          confidence: "HIGH",
          evidenceType: "script",
        });
      }

      if (
        hasDependency(packageJson, "express") ||
        hasDependency(packageJson, "mongoose") ||
        hasDependency(packageJson, "mongodb") ||
        hasDependency(packageJson, "@types/node")
      ) {
        evidence.push({
          category: "runtime",
          technology: "Node.js",
          source: unit.packageJsonPath,
          detail:
            "Node.js ecosystem dependency detected",
          confidence: "MEDIUM",
          evidenceType: "dependency",
        });
      }
    }

    return {
      runtime:
        evidence.length > 0
          ? "Node.js"
          : null,
      evidence,
    };
  }
}

export const runtimeDetector =
  new RuntimeDetector();