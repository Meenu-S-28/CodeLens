import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env.js";
import { AppError } from "../../common/errors/app-error.js";

export class WorkspaceService {
  private readonly rootPath: string;

  constructor() {
    this.rootPath = path.resolve(env.WORKSPACE_ROOT);
  }

  getProjectPath(projectId: string): string {
    const projectPath = path.resolve(
      this.rootPath,
      projectId
    );

    const relativePath = path.relative(
      this.rootPath,
      projectPath
    );

    if (
      relativePath.startsWith("..") ||
      path.isAbsolute(relativePath)
    ) {
      throw new AppError(
        "INVALID_WORKSPACE_PATH",
        "Invalid project workspace path",
        400
      );
    }

    return projectPath;
  }

  getRepositoryPath(projectId: string): string {
    return path.join(
      this.getProjectPath(projectId),
      "repository"
    );
  }

  async create(projectId: string): Promise<string> {
    const projectPath = this.getProjectPath(projectId);

    await fs.mkdir(projectPath, {
      recursive: true,
    });

    return projectPath;
  }

  async cleanup(projectId: string): Promise<void> {
    const projectPath = this.getProjectPath(projectId);

    await fs.rm(projectPath, {
      recursive: true,
      force: true,
    });
  }

  async createRepositoryDirectory(
    projectId: string
    ): Promise<string> {
    const repositoryPath =
      this.getRepositoryPath(projectId);

    await fs.mkdir(repositoryPath, {
      recursive: true,
    });

    return repositoryPath;
  }
  
}

export const workspaceService = new WorkspaceService();