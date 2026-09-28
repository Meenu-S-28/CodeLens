import { prisma } from "../../infrastructure/database/prisma.js";
import { AppError } from "../../common/errors/app-error.js";

import type {
  DetectionResult,
} from "./detection.types.js";

import { projectStructureAnalyzer } from "./project-structure.analyzer.js";
import { packageManagerDetector } from "./package-manager.detector.js";
import { languageDetector } from "./language.detector.js";
import { runtimeDetector } from "./runtime.detector.js";
import { frontendDetector } from "./frontend.detector.js";
import { backendDetector } from "./backend.detector.js";
import { databaseDetector } from "./database.detector.js";
import { buildToolDetector } from "./build-tool.detector.js";
import { architectureDetector } from "./architecture.detector.js";

export class DetectionService {
  async detect(
    projectId: string
  ): Promise<DetectionResult> {
    const project =
      await prisma.project.findUnique({
        where: {
          id: projectId,
        },
      });

    if (!project) {
      throw new AppError(
        "PROJECT_NOT_FOUND",
        `Project ${projectId} not found`,
        404
      );
    }

    if (project.status !== "CLONED") {
      throw new AppError(
        "PROJECT_NOT_READY",
        "Project must be successfully ingested before detection can run",
        409
      );
    }

    if (!project.workspacePath) {
      throw new AppError(
        "PROJECT_WORKSPACE_NOT_FOUND",
        "Project workspace is not available",
        500
      );
    }

    const structure =
      await projectStructureAnalyzer.analyze(
        projectId
      );

    const [
      packageManagerResult,
      languageResult,
      runtimeResult,
      frontendResult,
      backendResult,
      databaseResult,
      buildToolResult,
    ] = await Promise.all([
      packageManagerDetector.detect(
        projectId,
        structure.units
      ),

      languageDetector.detect(projectId),

      Promise.resolve(
        runtimeDetector.detect(structure.units)
      ),

      Promise.resolve(
        frontendDetector.detect(structure.units)
      ),

      Promise.resolve(
        backendDetector.detect(structure.units)
      ),

      Promise.resolve(
        databaseDetector.detect(structure.units)
      ),

      buildToolDetector.detect(
        projectId,
        structure.units
      ),
    ]);

    const architectureResult =
      architectureDetector.detect({
        runtime: runtimeResult.runtime,
        frontend: frontendResult.frontend,
        backend: backendResult.backend,
        database: databaseResult.database,
      });

    return {
      projectUnits: structure.units.map(
        (unit) => ({
          rootPath: unit.rootPath,
          packageJsonPath:
            unit.packageJsonPath,
        })
      ),

      language: languageResult.language,
      runtime: runtimeResult.runtime,
      frontend: frontendResult.frontend,
      backend: backendResult.backend,
      database: databaseResult.database,
      packageManager:
        packageManagerResult.packageManager,
      buildTool: buildToolResult.buildTool,
      architecture:
        architectureResult.architecture,

      evidence: [
        ...languageResult.evidence,
        ...runtimeResult.evidence,
        ...frontendResult.evidence,
        ...backendResult.evidence,
        ...databaseResult.evidence,
        ...packageManagerResult.evidence,
        ...buildToolResult.evidence,
        ...architectureResult.evidence,
      ],

      warnings: [
        ...structure.warnings,
        ...languageResult.warnings,
        ...packageManagerResult.warnings,
      ],
    };
  }
}

export const detectionService =
  new DetectionService();