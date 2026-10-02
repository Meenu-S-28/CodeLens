import path from "node:path";

/**
 * Converts repository-relative paths into a platform-independent form.
 *
 * CodeLens uses repository paths as semantic identifiers, so they must use
 * forward slashes regardless of the operating system running the parser.
 */
export const toPortablePath = (filePath: string): string => {
  return path.posix.normalize(filePath.replaceAll("\\", "/"));
};
