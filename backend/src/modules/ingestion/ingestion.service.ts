import { prisma } from "../../infrastructure/database/prisma.js";
import { gitService } from "./git.service.js";
import { workspaceService } from "./workspace.service.js";
import { logger } from "../../common/logger.js";
import { IngestionError } from "../../common/errors/ingestion-error.js";

export class IngestionService {
  async ingestProject(projectId: string): Promise<void> {
    const startedAt = Date.now();

    logger.info("Project ingestion started", {
      projectId,
    });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      logger.error("Project not found during ingestion", {
        projectId,
      });

      throw new IngestionError(
        "PROJECT_NOT_FOUND",
        `Project ${projectId} not found`,
        404,
        false
      );
    }

    /*
     * Idempotency:
     * If the project has already been successfully cloned,
     * there is nothing more for the ingestion worker to do.
     *
     * Most importantly, do NOT delete its workspace because
     * later CodeLens modules will use this repository.
     */
    if (project.status === "CLONED") {
      logger.info("Project already cloned; skipping ingestion", {
        projectId,
        commitSha: project.commitSha,
        workspacePath: project.workspacePath,
      });

      return;
    }

    /*
     * The project was not successfully cloned.
     *
     * A previous attempt may have left behind a partial workspace,
     * so remove it before starting a fresh ingestion attempt.
     */
    logger.info("Preparing workspace for ingestion", {
      projectId,
      previousStatus: project.status,
    });

    await workspaceService.cleanup(projectId);

    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "CLONING",
      },
    });

    logger.info("Project status updated", {
      projectId,
      status: "CLONING",
    });

    try {
      const workspacePath =
        await workspaceService.create(projectId);

      logger.info("Project workspace created", {
        projectId,
        workspacePath,
      });

      const repositoryPath =
        await workspaceService.createRepositoryDirectory(projectId);

      logger.info("Repository workspace created", {
        projectId,
        repositoryPath,
      });

      await gitService.clone(
        project.repositoryUrl,
        repositoryPath
      );

      const commitSha =
        await gitService.getCurrentCommitSha(repositoryPath);

      await prisma.project.update({
        where: { id: projectId },
        data: {
          status: "CLONED",
          commitSha,
          workspacePath,
        },
      });

      logger.info("Project ingestion completed", {
        projectId,
        commitSha,
        workspacePath,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      logger.error("Project ingestion failed", {
        projectId,
        durationMs: Date.now() - startedAt,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });

      await prisma.project.update({
        where: { id: projectId },
        data: {
          status: "FAILED",
        },
      });

      /*
       * Cleanup is best-effort.
       *
       * If cleanup itself fails, we don't want to hide the
       * original ingestion error that caused this failure.
       */
      try {
        await workspaceService.cleanup(projectId);

        logger.info("Project workspace cleaned after failure", {
          projectId,
        });
      } catch (cleanupError) {
        logger.error("Failed to clean project workspace", {
          projectId,
          error:
            cleanupError instanceof Error
              ? cleanupError.message
              : String(cleanupError),
        });
      }

      throw error;
    }
  }
}

export const ingestionService = new IngestionService();