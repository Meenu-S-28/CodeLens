import type {
  DetectionEvidence,
  DetectedPackageManager,
} from "./detection.types.js";

import type { ProjectUnit } from "./project-structure.analyzer.js";

import { repositoryInspector } from "./repository-inspector.service.js";

const LOCKFILES = {
  npm: ["package-lock.json"],
  Yarn: ["yarn.lock"],
  pnpm: ["pnpm-lock.yaml"],
  Bun: ["bun.lock", "bun.lockb"],
} as const;

export interface PackageManagerDetection {
  packageManager: DetectedPackageManager | null;
  evidence: DetectionEvidence[];
  warnings: {
    code: string;
    message: string;
  }[];
}

export class PackageManagerDetector {
  async detect(
    projectId: string,
    units: ProjectUnit[]
  ): Promise<PackageManagerDetection> {
    const matches = new Map<
      DetectedPackageManager,
      string[]
    >();

    // First inspect lockfiles relative to every package root.
    for (const unit of units) {
      const unitPath = unit.rootPath;

      for (const [
        manager,
        files,
      ] of Object.entries(LOCKFILES) as [
        DetectedPackageManager,
        readonly string[]
      ][]) {
        for (const file of files) {
          const lockfilePath = unitPath
            ? `${unitPath}/${file}`
            : file;

          if (
            await repositoryInspector.fileExists(
              projectId,
              lockfilePath
            )
          ) {
            const existing =
              matches.get(manager) ?? [];

            existing.push(lockfilePath);
            matches.set(manager, existing);

            break;
          }
        }
      }
    }

    const uniqueManagers = [
      ...matches.keys(),
    ];

    const evidence: DetectionEvidence[] = [];
    const warnings: PackageManagerDetection["warnings"] =
      [];

    if (uniqueManagers.length === 1) {
      const manager = uniqueManagers[0];
      const lockfiles = matches.get(manager)!;

      for (const lockfile of lockfiles) {
        evidence.push({
          category: "package-manager",
          technology: manager,
          source: lockfile,
          detail: `${manager} lockfile detected`,
          confidence: "HIGH",
          evidenceType: "lockfile",
        });
      }

      return {
        packageManager: manager,
        evidence,
        warnings,
      };
    }

    if (uniqueManagers.length > 1) {
      warnings.push({
        code: "MULTIPLE_PACKAGE_MANAGERS",
        message:
          "Multiple package-manager lockfiles were detected; package manager could not be determined with confidence.",
      });

      for (const manager of uniqueManagers) {
        for (const lockfile of matches.get(manager)!) {
          evidence.push({
            category: "package-manager",
            technology: manager,
            source: lockfile,
            detail:
              `${manager} lockfile detected, but another package-manager lockfile is also present`,
            confidence: "LOW",
            evidenceType: "lockfile",
          });
        }
      }

      return {
        packageManager: null,
        evidence,
        warnings,
      };
    }

    // Fall back to packageManager fields.
    for (const unit of units) {
      if (!unit.packageJson.packageManager) {
        continue;
      }

      const value =
        unit.packageJson.packageManager.toLowerCase();

      const manager =
        value.startsWith("npm@")
          ? "npm"
          : value.startsWith("yarn@")
            ? "Yarn"
            : value.startsWith("pnpm@")
              ? "pnpm"
              : value.startsWith("bun@")
                ? "Bun"
                : null;

      if (!manager) {
        continue;
      }

      evidence.push({
        category: "package-manager",
        technology: manager,
        source: unit.packageJsonPath,
        detail:
          `packageManager field declares ${manager}`,
        confidence: "MEDIUM",
        evidenceType: "package-field",
      });

      return {
        packageManager: manager,
        evidence,
        warnings,
      };
    }

    return {
      packageManager: null,
      evidence,
      warnings,
    };
  }
}

export const packageManagerDetector =
  new PackageManagerDetector();