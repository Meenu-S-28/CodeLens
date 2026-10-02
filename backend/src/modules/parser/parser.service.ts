// src/modules/parser/parser.service.ts

import {
  prisma,
} from "../../infrastructure/database/prisma.js";

import {
  AppError,
} from "../../common/errors/app-error.js";

import {
  repositoryInspector,
} from "../detection/repository-inspector.service.js";

import {
  SUPPORTED_SOURCE_EXTENSIONS,
} from "./parser.constants.js";

import {
  sourceParser,
} from "./file-parser/source-parser.js";

import {
  traverseAST,
} from "./ast/ast-traverser.js";

import {
  irBuilder,
} from "./ir/ir.builder.js";

import type {
  ProjectParserResult,
} from "./parser.types.js";

import type {
  ProjectIR,
  SourceDiagnostic,
} from "./ir/ir.types.js";

export class ParserService {
  async parseProject(
    projectId: string
  ): Promise<ProjectParserResult> {
    const project =
      await prisma.project.findUnique({
        where: {
          id: projectId,
        },
      });

    if (!project) {
      throw new AppError(
        "PROJECT_NOT_FOUND",
        `Project ${projectId} not found`,
        404
      );
    }

    if (
      project.status !==
      "CLONED"
    ) {
      throw new AppError(
        "PROJECT_NOT_READY",
        "Project must be successfully ingested before parsing can run",
        409
      );
    }

    if (!project.workspacePath) {
      throw new AppError(
        "PROJECT_WORKSPACE_NOT_FOUND",
        "Project workspace is not available",
        500
      );
    }

    const sourceFiles =
      await repositoryInspector
        .findSourceFiles(
          projectId
        );

    const supportedFiles =
      sourceFiles.filter(
        (file) =>
          SUPPORTED_SOURCE_EXTENSIONS.has(
            file.extension as
              | ".js"
              | ".jsx"
              | ".ts"
              | ".tsx"
          )
      );

    const fileIRs =
      [];

    const diagnostics:
      SourceDiagnostic[] = [];

    for (
      const file
        of supportedFiles
    ) {
      let source: string;

      try {
        source =
          await repositoryInspector
            .readFile(
              projectId,
              file.relativePath
            );
      } catch (error) {
        diagnostics.push({
          code:
            "SOURCE_READ_ERROR",

          message:
            error instanceof Error
              ? error.message
              : "Unable to read source file",

          severity: "ERROR",

          file:
            file.relativePath,
        });

        continue;
      }

      const parseResult =
        sourceParser.parse(
          file.relativePath,
          source
        );

      diagnostics.push(
        ...parseResult.diagnostics
      );

      if (
        !parseResult.parsedFile
      ) {
        continue;
      }

      try {
        const traversalResult =
          traverseAST(
            parseResult
              .parsedFile
              .ast,

            parseResult
              .parsedFile
              .path,

            parseResult
              .parsedFile
              .language
          );

        fileIRs.push(
          traversalResult.fileIR
        );

        diagnostics.push(
          ...traversalResult
            .diagnostics
        );
      } catch (error) {
        diagnostics.push({
          code:
            "AST_TRAVERSAL_ERROR",

          message:
            error instanceof Error
              ? error.message
              : "AST traversal failed",

          severity: "ERROR",

          file:
            file.relativePath,
        });
      }
    }

    const projectIR =
      irBuilder.buildProjectIR(
        projectId,
        fileIRs,
        diagnostics
      );

    return {
      project: projectIR,

      summary:
        irBuilder.buildSummary(
          projectIR
        ),
    };
  }
}

export const parserService =
  new ParserService();