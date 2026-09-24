export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    code: string,
    message: string,
    statusCode: number,
    isOperational = true,
    options?: {
      cause?: unknown;
    }
  ) {
    super(message, options);

    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}