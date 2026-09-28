import type {
  DetectionEvidence,
  DetectedBuildTool,
} from "./detection.types.js";

import type { ProjectUnit } from "./project-structure.analyzer.js";

import { repositoryInspector } from "./repository-inspector.service.js";
import { hasDependency } from "./package-utils.js";

export interface BuildToolDetection {
  buildTool: DetectedBuildTool | null;
  evidence: DetectionEvidence[];
}

export class BuildToolDetector {
  async detect(
    projectId: string,
    units: ProjectUnit[]
  ): Promise<BuildToolDetection> {
    const evidence: DetectionEvidence[] = [];

    const configNames = [
      "vite.config.js",
      "vite.config.ts",
      "vite.config.mjs",
      "vite.config.cjs",
    ];

    for (const unit of units) {
      const packageJson = unit.packageJson;

      if (hasDependency(packageJson, "vite")) {
        evidence.push({
          category: "build-tool",
          technology: "Vite",
          source: unit.packageJsonPath,
          detail:
            "vite dependency detected",
          confidence: "HIGH",
          evidenceType: "dependency",
        });
      }

      for (const configName of configNames) {
        const configPath = unit.rootPath
          ? `${unit.rootPath}/${configName}`
          : configName;

        if (
          await repositoryInspector.fileExists(
            projectId,
            configPath
          )
        ) {
          evidence.push({
            category: "build-tool",
            technology: "Vite",
            source: configPath,
            detail:
              "Vite configuration file detected",
            confidence: "HIGH",
            evidenceType: "config",
          });

          break;
        }
      }
    }

    return {
      buildTool:
        evidence.length > 0
          ? "Vite"
          : null,
      evidence,
    };
  }
}

export const buildToolDetector =
  new BuildToolDetector();