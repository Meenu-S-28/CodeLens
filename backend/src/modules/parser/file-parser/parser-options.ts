// src/modules/parser/file-parser/parser-options.ts

import type { ParserOptions } from "@babel/parser";

import type {
  SupportedSourceExtension,
} from "../parser.types.js";

import {
  JSX_EXTENSIONS,
  TYPESCRIPT_EXTENSIONS,
} from "../parser.constants.js";

export const getParserOptions = (
  filePath: string,
  extension: SupportedSourceExtension
): ParserOptions => {
  const plugins: NonNullable<
    ParserOptions["plugins"]
  > = [];

  if (TYPESCRIPT_EXTENSIONS.has(extension)) {
    plugins.push("typescript");
  }

  if (JSX_EXTENSIONS.has(extension)) {
    plugins.push("jsx");
  }

  return {
    sourceType: "unambiguous",

    sourceFilename: filePath,

    plugins,

    errorRecovery: false,

    ranges: false,

    tokens: false,
  };
};