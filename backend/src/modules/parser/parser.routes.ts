// src/modules/parser/parser.routes.ts

import {
  Router,
} from "express";

import {
  asyncHandler,
} from "../../common/middleware/async-handler.js";

import {
  parseProjectController,
  parserSummaryController,
} from "./parser.controller.js";

const router =
  Router();

router.get(
  "/projects/:projectId/parser",
  asyncHandler(
    parseProjectController
  )
);

router.get(
  "/projects/:projectId/parser/summary",
  asyncHandler(
    parserSummaryController
  )
);

export default router;