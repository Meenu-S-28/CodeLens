import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL"),
  WORKSPACE_ROOT: z
  .string()
  .min(1, "WORKSPACE_ROOT is required"),
  GIT_CLONE_TIMEOUT_MS: z.coerce.number().int().positive().default(300000),
});
  
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment configuration:");
  console.error(parsedEnv.error.format());

  process.exit(1);
}

export const env = parsedEnv.data;