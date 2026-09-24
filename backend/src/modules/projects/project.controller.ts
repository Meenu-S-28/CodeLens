import type { Request, Response } from "express";

import {
  createProjectSchema,
  projectIdParamSchema,
} from "./project.schema.js";

import {
  createProject,
  requestProjectIngestion,
} from "./project.service.js";

export const createProjectController = async (
  req: Request,
  res: Response
) => {
  const { repositoryUrl } =
    createProjectSchema.parse(req.body);

  const project = await createProject(repositoryUrl);

  res.status(201).json({
    success: true,
    data: {
      id: project.id,
      repositoryUrl: project.repositoryUrl,
      repositoryHost: project.repositoryHost,
      status: project.status,
      createdAt: project.createdAt,
    },
  });
};

export const ingestProjectController = async (
  req: Request,
  res: Response
) => {
  const { projectId } =
    projectIdParamSchema.parse(req.params);

  const { project, jobId } =
    await requestProjectIngestion(projectId);

  res.status(202).json({
    success: true,
    message: "Project ingestion queued",
    data: {
      id: project.id,
      repositoryUrl: project.repositoryUrl,
      repositoryHost: project.repositoryHost,
      status: project.status,
      jobId,
    },
  });
};