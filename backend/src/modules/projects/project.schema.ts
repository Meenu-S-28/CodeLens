import { z } from "zod";

export const createProjectSchema = z.object({
  repositoryUrl: z
    .string()
    .trim()
    .url("Repository URL must be a valid URL"),
});

export const projectIdParamSchema = z.object({
  projectId: z
    .string()
    .uuid("Project ID must be a valid UUID"),
});