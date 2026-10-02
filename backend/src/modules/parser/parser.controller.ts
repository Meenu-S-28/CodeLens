// src/modules/parser/parser.controller.ts

import type {
  Request,
  Response,
} from "express";

import {
  projectIdParamSchema,
} from "../projects/project.schema.js";

import {
  parserService,
} from "./parser.service.js";

export const parseProjectController =
  async (
    req: Request,
    res: Response
  ) => {
    const {
      projectId,
    } =
      projectIdParamSchema.parse(
        req.params
      );

    const result =
      await parserService
        .parseProject(
          projectId
        );

    res.status(200).json({
      success: true,

      data: result.project,
    });
  };

export const parserSummaryController =
  async (
    req: Request,
    res: Response
  ) => {
    const {
      projectId,
    } =
      projectIdParamSchema.parse(
        req.params
      );

    const result =
      await parserService
        .parseProject(
          projectId
        );

    res.status(200).json({
      success: true,

      data: result.summary,
    });
  };