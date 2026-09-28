import type { PackageJson } from "./package-json.types.js";
import { packageJsonAnalyzer } from "./package-json.analyzer.js";
import { repositoryInspector } from "./repository-inspector.service.js";
import path from "node:path";

export interface ProjectUnit {
  rootPath: string;
  packageJsonPath: string;
  packageJson: PackageJson;
}

export interface ProjectStructureAnalysis {
  units: ProjectUnit[];
  warnings: {
    code: string;
    message: string;
  }[];
}

export class ProjectStructureAnalyzer {
  async analyze(projectId: string): Promise<ProjectStructureAnalysis> {
    const warnings: ProjectStructureAnalysis["warnings"] = [];

    const packageJsonPaths =
      await repositoryInspector.findFilesByName(
        projectId,
        "package.json"
      );

    const units: ProjectUnit[] = [];

    for (const packageJsonPath of packageJsonPaths) {
      try {
        const packageJson =
          await packageJsonAnalyzer.analyze(
            projectId,
            packageJsonPath
          );

        if (!packageJson) {
          continue;
        }

        const normalizedPackageJsonPath = packageJsonPath.split(path.sep).join("/");

        const rootPath = normalizedPackageJsonPath === "package.json"
            ? ""
            : normalizedPackageJsonPath.replace(
                /\/package\.json$/,
            ""
        );


        units.push({
          rootPath,
          packageJsonPath: normalizedPackageJsonPath,
          packageJson,
        });
      } catch (error) {
        warnings.push({
          code: "INVALID_PACKAGE_JSON",
          message:
            `Could not analyze ${packageJsonPath}: ` +
            `${
              error instanceof Error
                ? error.message
                : String(error)
            }`,
        });
      }
    }

    if (units.length === 0) {
      warnings.push({
        code: "PACKAGE_JSON_NOT_FOUND",
        message:
          "No valid package.json files were found; JavaScript ecosystem detection may be incomplete.",
      });
    }

    return {
      units,
      warnings,
    };
  }
}

export const projectStructureAnalyzer =
  new ProjectStructureAnalyzer();