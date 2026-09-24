import { Worker, UnrecoverableError } from "bullmq";

import {
  PROJECT_INGESTION_QUEUE,
  type ProjectIngestionJobData,
} from "../infrastructure/queue/project-ingestion.queue.js";

import { redisConnection } from "../infrastructure/queue/redis.js";

import { ingestionService } from "../modules/ingestion/ingestion.service.js";

import { logger } from "../common/logger.js";

import { IngestionError } from "../common/errors/ingestion-error.js";

const worker = new Worker<ProjectIngestionJobData>(
  PROJECT_INGESTION_QUEUE,
  async (job) => {
    const startedAt = Date.now();

    logger.info("Project ingestion job started", {
      jobId: job.id,
      projectId: job.data.projectId,
    });

    try {
      await ingestionService.ingestProject(
        job.data.projectId
      );

      logger.info("Project ingestion job finished", {
        jobId: job.id,
        projectId: job.data.projectId,
        durationMs: Date.now() - startedAt,
      });

      return {
        projectId: job.data.projectId,
        status: "CLONED",
      };
    } catch (error) {
      logger.error("Project ingestion job failed", {
        jobId: job.id,
        projectId: job.data.projectId,
        durationMs: Date.now() - startedAt,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });

      if (
        error instanceof IngestionError &&
        !error.retryable
      ) {
        throw new UnrecoverableError(error.message);
      }

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

worker.on("completed", (job) => {
  logger.info("Project ingestion job completed", {
    jobId: job.id,
    projectId: job.data.projectId,
  });
});

worker.on("failed", (job, error) => {
  logger.error("Project ingestion job marked failed", {
    jobId: job?.id,
    projectId: job?.data.projectId,
    error: error.message,
  });
});

worker.on("error", (error) => {
  logger.error("Project ingestion worker error", {
    error: error.message,
  });
});

/**
 * Graceful shutdown
 *
 * SIGINT  -> Ctrl + C
 * SIGTERM -> Docker / process manager shutdown
 */

let isShuttingDown = false;

const shutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  logger.info("Worker shutdown requested", {
    signal,
  });

  try {
    logger.info("Closing project ingestion worker");

    await worker.close();

    logger.info("Project ingestion worker closed");

    logger.info("Closing Redis connection");

    await redisConnection.quit();

    logger.info("Redis connection closed");

    process.exit(0);
  } catch (error) {
    logger.error("Worker shutdown failed", {
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });

    process.exit(1);
  }
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

logger.info("Project ingestion worker started", {
  queue: PROJECT_INGESTION_QUEUE,
});