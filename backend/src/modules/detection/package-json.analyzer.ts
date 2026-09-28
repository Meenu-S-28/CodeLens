import { AppError } from "../../common/errors/app-error.js";
import { repositoryInspector } from "./repository-inspector.service.js";
import {
  packageJsonSchema,
  type PackageJson,
} from "./package-json.types.js";

export class PackageJsonAnalyzer {
  async analyze(
    projectId: string,
    packageJsonPath = "package.json"
  ): Promise<PackageJson | null> {
    const exists =
      await repositoryInspector.fileExists(
        projectId,
        packageJsonPath
      );

    if (!exists) {
      return null;
    }

    const content =
      await repositoryInspector.readFile(
        projectId,
        packageJsonPath
      );

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new AppError(
        "INVALID_PACKAGE_JSON",
        `${packageJsonPath} contains invalid JSON`,
        422,
        true,
        {cause: error}
      );
    }

    const result =
      packageJsonSchema.safeParse(parsed);

    if (!result.success) {
      throw new AppError(
        "INVALID_PACKAGE_JSON",
        `${packageJsonPath} does not have the expected structure`,
        422,
        true,
        result.error
      );
    }

    return result.data;
  }
}

export const packageJsonAnalyzer =
  new PackageJsonAnalyzer();