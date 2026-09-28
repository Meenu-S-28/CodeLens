import { z } from "zod";

export const packageJsonSchema = z.object({
  name: z.string().optional(),

  version: z.string().optional(),

  type: z
    .enum(["commonjs", "module"])
    .optional(),

  scripts: z
    .record(z.string(), z.string())
    .optional(),

  dependencies: z
    .record(z.string(), z.string())
    .optional(),

  devDependencies: z
    .record(z.string(), z.string())
    .optional(),

  engines: z
    .object({
      node: z.string().optional(),
    })
    .optional(),

  packageManager: z.string().optional(),
});

export type PackageJson = z.infer<
  typeof packageJsonSchema
>;