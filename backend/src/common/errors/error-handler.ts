import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { AppError } from "./app-error.js";
import { logger } from "../logger.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next
) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.flatten().fieldErrors,
      },
    });

    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });

    return;
  }

  logger.error("Unhandled HTTP error", {
    error:
      error instanceof Error
        ? error.message
        : String(error),
    stack:
      error instanceof Error
        ? error.stack
        : undefined,
  });

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
};