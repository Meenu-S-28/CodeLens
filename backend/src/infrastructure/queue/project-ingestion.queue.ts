import { Queue } from "bullmq";
import { redisConnection } from "./redis.js";

export const PROJECT_INGESTION_QUEUE =
  "project-ingestion";

export interface ProjectIngestionJobData {
  projectId: string;
}

export const projectIngestionQueue =
  new Queue<ProjectIngestionJobData>(
    PROJECT_INGESTION_QUEUE,
    {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: {
          count: 100,
        },
        removeOnFail: {
          count: 500,
        },
      },
    }
  );