import fs from "node:fs/promises";
import path from "node:path";

import { AppError } from "../../common/errors/app-error.js";
import { toPortablePath } from "../../common/utils/path.utils.js";
import { workspaceService } from "../ingestion/workspace.service.js";
import { IGNORED_DIRECTORIES } from "./detection.constants.js";

export interface RepositoryFile {
  relativePath: string;
  extension: string;
}

export class RepositoryInspector {
  private getRepositoryPath(projectId: string): string {
    return workspaceService.getRepositoryPath(projectId);
  }

  async readFile(projectId: string, relativePath: string): Promise<string> {
    const repositoryPath = this.getRepositoryPath(projectId);
    const filePath = this.resolveSafePath(repositoryPath, relativePath);
    return fs.readFile(filePath, "utf-8");
  }

  async fileExists(
    projectId: string,
    relativePath: string
  ): Promise<boolean> {
    const repositoryPath = this.getRepositoryPath(projectId);
    const filePath = this.resolveSafePath(repositoryPath, relativePath);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async listDirectory(
    projectId: string,
    relativePath = ""
  ): Promise<string[]> {
    const repositoryPath = this.getRepositoryPath(projectId);
    const directoryPath = this.resolveSafePath(repositoryPath, relativePath);

    const entries = await fs.readdir(directoryPath, {
      withFileTypes: true,
    });

    return entries
      .filter((entry) => !IGNORED_DIRECTORIES.has(entry.name))
      .map((entry) => entry.name);
  }

  async findSourceFiles(projectId: string): Promise<RepositoryFile[]> {
    const repositoryPath = this.getRepositoryPath(projectId);
    const result: RepositoryFile[] = [];

    await this.walkDirectory(repositoryPath, repositoryPath, result);

    return result;
  }

  async findFilesByName(
    projectId: string,
    fileName: string,
    maxDepth = 6
  ): Promise<string[]> {
    const repositoryPath = this.getRepositoryPath(projectId);
    const result: string[] = [];

    await this.findFilesByNameRecursive(
      repositoryPath,
      repositoryPath,
      fileName,
      0,
      maxDepth,
      result
    );

    return result;
  }

  private async findFilesByNameRecursive(
    repositoryRoot: string,
    currentDirectory: string,
    fileName: string,
    currentDepth: number,
    maxDepth: number,
    result: string[]
  ): Promise<void> {
    if (currentDepth > maxDepth) {
      return;
    }

    const entries = await fs.readdir(currentDirectory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      if (entry.isSymbolicLink()) {
        continue;
      }

      const absolutePath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        await this.findFilesByNameRecursive(
          repositoryRoot,
          absolutePath,
          fileName,
          currentDepth + 1,
          maxDepth,
          result
        );
        continue;
      }

      if (!entry.isFile() || entry.name !== fileName) {
        continue;
      }

      result.push(
        toPortablePath(path.relative(repositoryRoot, absolutePath))
      );
    }
  }

  private async walkDirectory(
    repositoryRoot: string,
    currentDirectory: string,
    result: RepositoryFile[]
  ): Promise<void> {
    const entries = await fs.readdir(currentDirectory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        IGNORED_DIRECTORIES.has(entry.name)
      ) {
        continue;
      }

      if (entry.isSymbolicLink()) {
        continue;
      }

      const absolutePath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        await this.walkDirectory(repositoryRoot, absolutePath, result);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();

      if (!extension) {
        continue;
      }

      result.push({
        relativePath: toPortablePath(
          path.relative(repositoryRoot, absolutePath)
        ),
        extension,
      });
    }
  }

  private resolveSafePath(
    repositoryPath: string,
    relativePath: string
  ): string {
    const resolvedPath = path.resolve(repositoryPath, relativePath);

    const relative = path.relative(repositoryPath, resolvedPath);

    if (
      relative.startsWith("..") ||
      path.isAbsolute(relative)
    ) {
      throw new AppError(
        "INVALID_REPOSITORY_PATH",
        "Invalid repository path",
        400
      );
    }

    return resolvedPath;
  }
}

export const repositoryInspector = new RepositoryInspector();
