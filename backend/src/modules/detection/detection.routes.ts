import { Router } from "express";

import { asyncHandler } from "../../common/middleware/async-handler.js";

import {
  detectProjectController,
} from "./detection.controller.js";

const router = Router();

router.get(
  "/projects/:projectId/detection",
  asyncHandler(
    detectProjectController
  )
);

export default router;