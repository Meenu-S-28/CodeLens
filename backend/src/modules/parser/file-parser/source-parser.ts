// src/modules/parser/file-parser/source-parser.ts

import path from "node:path";

import {
  parse,
} from "@babel/parser";

import {
  SUPPORTED_SOURCE_EXTENSIONS,
} from "../parser.constants.js";

import type {
  ParsedSourceFile,
  SourceParseResult,
  SupportedSourceExtension,
} from "../parser.types.js";

import {
  getParserOptions,
} from "./parser-options.js";

const getSupportedExtension = (
  filePath: string
): SupportedSourceExtension | null => {
  const extension = path
    .extname(filePath)
    .toLowerCase();

  if (
    !SUPPORTED_SOURCE_EXTENSIONS.has(
      extension as SupportedSourceExtension
    )
  ) {
    return null;
  }

  return extension as SupportedSourceExtension;
};

const getLanguage = (
  extension: SupportedSourceExtension
): "javascript" | "typescript" => {
  return extension === ".ts" ||
    extension === ".tsx"
    ? "typescript"
    : "javascript";
};

export class SourceParser {
  parse(
    filePath: string,
    source: string
  ): SourceParseResult {
    const extension =
      getSupportedExtension(filePath);

    if (!extension) {
      return {
        parsedFile: null,

        diagnostics: [
          {
            code: "UNSUPPORTED_SOURCE_FILE",
            message:
              `Unsupported source file extension: ${path.extname(filePath)}`,
            severity: "WARNING",
            file: filePath,
          },
        ],
      };
    }

    try {
      const ast = parse(
        source,
        getParserOptions(
          filePath,
          extension
        )
      );

      return {
        parsedFile: {
          path: filePath,
          extension,
          language: getLanguage(extension),
          ast,
        },

        diagnostics: [],
      };
    } catch (error) {
      return {
        parsedFile: null,

        diagnostics: [
          {
            code: "PARSE_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Source file could not be parsed",
            severity: "ERROR",
            file: filePath,
          },
        ],
      };
    }
  }
}

export const sourceParser =
  new SourceParser();