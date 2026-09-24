import express from "express";
import { errorHandler } from "./common/errors/error-handler.js";
import { notFoundHandler } from "./common/middleware/not-found.js";
import projectRoutes from "./modules/projects/project.routes.js";
const app = express();

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "codelens-backend",
  });
});

app.use("/api/projects", projectRoutes);

app.use(notFoundHandler);
app.use(errorHandler);


export default app; 