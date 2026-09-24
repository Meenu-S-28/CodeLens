import {simpleGit} from "simple-git";

import { logger } from "../../common/logger.js";
import { IngestionError } from "../../common/errors/ingestion-error.js";
import { env } from "../../config/env.js";

function classifyGitError(error: unknown): IngestionError {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  const normalized = message.toLowerCase();

  if (
    normalized.includes("authentication failed") ||
    normalized.includes("could not read username") ||
    normalized.includes("invalid username or password") ||
    normalized.includes("permission denied")
  ) {
    return new IngestionError(
      "GIT_AUTHENTICATION_FAILED",
      "Git repository authentication failed",
      500,
      false,
      error
    );
  }

  if (
    normalized.includes("repository not found") ||
    normalized.includes("does not exist") ||
    normalized.includes("not found")
  ) {
    return new IngestionError(
      "REPOSITORY_NOT_FOUND",
      "Git repository could not be found",
      404,
      false,
      error
    );
  }

  if (
    normalized.includes("timeout") ||
    normalized.includes("timed out")
  ) {
    return new IngestionError(
      "GIT_TIMEOUT",
      "Git operation timed out",
      500,
      true,
      error
    );
  }

  if (
    normalized.includes("could not resolve host") ||
    normalized.includes("connection reset") ||
    normalized.includes("network is unreachable")
  ) {
    return new IngestionError(
      "GIT_NETWORK_ERROR",
      "A temporary network error occurred while accessing the Git repository",
      500,
      true,
      error
    );
  }

  return new IngestionError(
    "GIT_UNKNOWN_ERROR",
    "Git operation failed",
    500,
    true,
    error
  );
}

export class GitService {
  async clone(
    repositoryUrl: string,
    destination: string
  ): Promise<void> {
    const startedAt = Date.now();

    logger.info("Git clone started", {
      repositoryUrl,
      destination,
      timeoutMs: env.GIT_CLONE_TIMEOUT_MS,
    });

    try {
      const git = simpleGit({
        timeout: {
          block: env.GIT_CLONE_TIMEOUT_MS,
        },
      });

      await git.clone(repositoryUrl, destination, [
        "--depth",
        "1",
      ]);

      logger.info("Git clone completed", {
        repositoryUrl,
        destination,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      const ingestionError = classifyGitError(error);

      logger.error("Git clone failed", {
        repositoryUrl,
        destination,
        durationMs: Date.now() - startedAt,
        errorCode: ingestionError.code,
        retryable: ingestionError.retryable,
        error: ingestionError.message,
      });

      throw ingestionError;
    }
  }

  async getCurrentCommitSha(
    repositoryPath: string
  ): Promise<string> {
    logger.info("Resolving current commit SHA", {
      repositoryPath,
    });

    const git = simpleGit(repositoryPath);

    const result = await git.revparse(["HEAD"]);

    const commitSha = result.trim();

    logger.info("Current commit SHA resolved", {
      repositoryPath,
      commitSha,
    });

    return commitSha;
  }
}

export const gitService = new GitService();