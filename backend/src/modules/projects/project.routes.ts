import { Router } from "express";

import { asyncHandler } from "../../common/middleware/async-handler.js";

import {
  createProjectController,
  ingestProjectController,
} from "./project.controller.js";

const router = Router();

router.post(
  "/",
  asyncHandler(createProjectController)
);

router.post(
  "/:projectId/ingest",
  asyncHandler(ingestProjectController)
);

export default router;