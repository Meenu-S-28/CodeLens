import { AppError } from "./app-error.js";

export type IngestionErrorCode =
  | "PROJECT_NOT_FOUND"
  | "INVALID_REPOSITORY"
  | "REPOSITORY_NOT_FOUND"
  | "GIT_AUTHENTICATION_FAILED"
  | "GIT_NETWORK_ERROR"
  | "GIT_TIMEOUT"
  | "GIT_UNKNOWN_ERROR";

export class IngestionError extends AppError {
  public readonly retryable: boolean;

  constructor(
    code: IngestionErrorCode,
    message: string,
    statusCode: number,
    retryable: boolean,
    cause?: unknown
  ) {
    super(
      code,
      message,
      statusCode,
      true,
      { cause }
    );

    this.name = "IngestionError";
    this.retryable = retryable;
  }
}