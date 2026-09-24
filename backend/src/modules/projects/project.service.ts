import { prisma } from "../../infrastructure/database/prisma.js";
import { AppError } from "../../common/errors/app-error.js";
import { projectIngestionQueue } from "../../infrastructure/queue/project-ingestion.queue.js";

const SUPPORTED_GIT_HOSTS = new Set([
  "github.com",
  "gitlab.com",
  "bitbucket.org",
]);

const validateRepositoryUrl = (repositoryUrl: string): URL => {
  let url: URL;

  try {
    url = new URL(repositoryUrl);
  } catch {
    throw new AppError(
      "INVALID_REPOSITORY_URL",
      "Repository URL is invalid",
      400
    );
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new AppError(
      "UNSUPPORTED_REPOSITORY_PROTOCOL",
      "Repository URL must use HTTP or HTTPS",
      400
    );
  }

  if (url.username || url.password) {
    throw new AppError(
      "REPOSITORY_CREDENTIALS_NOT_ALLOWED",
      "Repository URLs must not contain embedded credentials",
      400
    );
  }

  if (url.search || url.hash) {
    throw new AppError(
      "INVALID_REPOSITORY_URL",
      "Repository URL must not contain query parameters or fragments",
      400
    );
  }

  const hostname = url.hostname.toLowerCase();

  if (!SUPPORTED_GIT_HOSTS.has(hostname)) {
    throw new AppError(
      "UNSUPPORTED_REPOSITORY_HOST",
      "Repository host is not currently supported",
      400
    );
  }

  const pathSegments = url.pathname
    .split("/")
    .filter(Boolean);

  if (pathSegments.length < 2) {
    throw new AppError(
      "INVALID_REPOSITORY_URL",
      "Repository URL must identify a repository",
      400
    );
  }

  return url;
};

export const createProject = async (repositoryUrl: string) => {
  const url = validateRepositoryUrl(repositoryUrl);

  const normalizedRepositoryUrl = url
    .toString()
    .replace(/\/$/, "");

  /*
   * For the initial CodeLens architecture, one Project represents
   * one repository.
   *
   * Therefore, submitting the same repository again should not
   * create another Project.
   */
  const existingProject = await prisma.project.findFirst({
    where: {
      repositoryUrl: normalizedRepositoryUrl,
    },
  });

  if (existingProject) {
    return existingProject;
  }

  const project = await prisma.project.create({
    data: {
      repositoryUrl: normalizedRepositoryUrl,
      repositoryHost: url.hostname.toLowerCase(),
    },
  });

  /*
   * Initial ingestion.
   *
   * We use a deterministic job ID so the initial ingestion job
   * cannot accidentally be queued multiple times.
   */
  await projectIngestionQueue.add(
    "ingest-project",
    {
      projectId: project.id,
    },
    {
      jobId: `project-${project.id}`,
    }
  );

  return project;
};

export const requestProjectIngestion = async (
  projectId: string
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new AppError(
      "PROJECT_NOT_FOUND",
      `Project ${projectId} not found`,
      404
    );
  }

  /*
   * Don't allow two ingestion operations for the same Project
   * to intentionally run at the same time.
   */
  if (project.status === "CLONING") {
    throw new AppError(
      "INGESTION_ALREADY_RUNNING",
      "Project ingestion is already in progress",
      409
    );
  }

  /*
   * CLONED is intentionally allowed here.
   *
   * The ingestion worker will detect that the project is already
   * successfully cloned and skip the actual clone operation.
   *
   * This gives us an explicit endpoint that is safe to call
   * without creating another Project or workspace.
   */
  const job = await projectIngestionQueue.add(
    "ingest-project",
    {
      projectId: project.id,
    },
    {
      /*
       * Re-ingestion must have a different job ID from the
       * original project creation job.
       *
       * Otherwise BullMQ may consider it the same job.
       */
      jobId: `project-ingestion-${project.id}-${Date.now()}`,
    }
  );

  return {
    project,
    jobId: job.id,
  };
};