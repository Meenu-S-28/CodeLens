import type { PackageJson } from "./package-json.types.js";

export const hasDependency = (
  packageJson: PackageJson,
  packageName: string
): boolean => {
  return Boolean(
    packageJson.dependencies?.[packageName] ||
    packageJson.devDependencies?.[packageName]
  );
};

export const getDependencySource = (
  packageJson: PackageJson,
  packageName: string
): "dependencies" | "devDependencies" | null => {
  if (
    packageJson.dependencies?.[packageName]
  ) {
    return "dependencies";
  }

  if (
    packageJson.devDependencies?.[packageName]
  ) {
    return "devDependencies";
  }

  return null;
};