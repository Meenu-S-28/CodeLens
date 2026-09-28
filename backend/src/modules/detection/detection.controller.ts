import type {
  Request,
  Response,
} from "express";

import { projectIdParamSchema } from "../projects/project.schema.js";

import { detectionService } from "./detection.service.js";

export const detectProjectController = async (
  req: Request,
  res: Response
) => {
  const { projectId } =
    projectIdParamSchema.parse(
      req.params
    );

  const detection =
    await detectionService.detect(
      projectId
    );

  res.status(200).json({
    success: true,
    data: detection,
  });
};