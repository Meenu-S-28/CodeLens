// src/modules/parser/ir/ir.builder.ts

import type {
  FileIR,
  ProjectIR,
  SourceDiagnostic,
} from "./ir.types.js";

import type {
  ParserSummary,
} from "../parser.types.js";

export class IRBuilder {
  buildProjectIR(
    projectId: string,
    files: FileIR[],
    diagnostics: SourceDiagnostic[]
  ): ProjectIR {
    return {
      projectId,

      generatedAt:
        new Date().toISOString(),

      files,

      diagnostics,
    };
  }

  buildSummary(
    projectIR: ProjectIR
  ): ParserSummary {
    let imports = 0;
    let exports = 0;

    let functions = 0;
    let classes = 0;

    let calls = 0;

    let routes = 0;

    let components = 0;
    let hooks = 0;

    let mongooseSchemas = 0;
    let mongooseModels = 0;

    for (
      const file
        of projectIR.files
    ) {
      imports +=
        file.imports.length;

      exports +=
        file.exports.length;

      functions +=
        file.functions.length;

      classes +=
        file.classes.length;

      calls +=
        file.calls.length;

      routes +=
        file.routes.length;

      components +=
        file.components.length;

      hooks +=
        file.hooks.length;

      mongooseSchemas +=
        file.mongooseSchemas.length;

      mongooseModels +=
        file.mongooseModels.length;
    }

    let errors = 0;
    let warnings = 0;

    for (
      const diagnostic
        of projectIR.diagnostics
    ) {
      if (
        diagnostic.severity ===
        "ERROR"
      ) {
        errors++;
      } else {
        warnings++;
      }
    }

    return {
      files:
        projectIR.files.length,

      imports,
      exports,

      functions,
      classes,

      calls,

      routes,

      components,
      hooks,

      mongooseSchemas,
      mongooseModels,

      errors,
      warnings,
    };
  }
}

export const irBuilder =
  new IRBuilder();