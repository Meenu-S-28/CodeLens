import type * as t from "@babel/types";

import type {
  FileIR,
  ProjectIR,
  SourceDiagnostic,
} from "./ir/ir.types.js";

export type SupportedSourceLanguage =
  | "javascript"
  | "typescript";

export type SupportedSourceExtension =
  | ".js"
  | ".jsx"
  | ".ts"
  | ".tsx";

export interface ParsedSourceFile {
  path: string;
  extension: SupportedSourceExtension;
  language: SupportedSourceLanguage;
  ast: t.File;
}

export interface SourceParseResult {
  parsedFile: ParsedSourceFile | null;
  diagnostics: SourceDiagnostic[];
}

export interface FileIRResult {
  ir: FileIR | null;
  diagnostics: SourceDiagnostic[];
}

export interface ParserSummary {
  files: number;
  imports: number;
  exports: number;
  functions: number;
  classes: number;
  calls: number;
  routes: number;
  components: number;
  hooks: number;
  mongooseSchemas: number;
  mongooseModels: number;
  errors: number;
  warnings: number;
}

export interface ProjectParserResult {
  project: ProjectIR;
  summary: ParserSummary;
}

/**
 * Static evidence collected from a source file for Express constructs.
 *
 * A route is only classified as an Express route when its receiver is one
 * of these known Express application/router bindings.
 */
export interface ExpressContext {
  expressFactoryNames: Set<string>;
  expressRouterNames: Set<string>;
}

/**
 * Static evidence collected from a source file for React hooks.
 *
 * reactHookNames contains local bindings imported from "react".
 * reactNamespaceNames contains namespace/default React bindings used as
 * React.useState(), React.useEffect(), etc.
 * customHookNames contains locally declared custom hooks for which the
 * parser found evidence of a React built-in hook inside the implementation.
 */
export interface ReactHookContext {
  /**
   * Directly imported, verified hooks.
   *
   * Example:
   * import { useState as state } from "react";
   *
   * "state" will be stored here.
   */
  reactHookNames: Set<string>;

  /**
   * Namespace/default imports that can expose hooks.
   *
   * Example:
   * import React from "react";
   * React.useState();
   *
   * "React" will be stored here.
   */
  reactNamespaceNames: Set<string>;

  /**
   * Hooks imported from other recognized hook libraries.
   *
   * Example:
   * import { useNavigate } from "react-router-dom";
   *
   * "useNavigate" will be stored here.
   */
  libraryHookNames: Set<string>;

  /**
   * Namespace imports from recognized hook libraries.
   *
   * Example:
   * import * as Router from "react-router";
   * Router.useNavigate();
   */
  libraryNamespaceNames: Set<string>;

  /**
   * Local custom hooks that have been statically verified
   * to use another verified hook.
   *
   * Example:
   *
   * function useAuth() {
   *   const [user] = useState(null);
   *   return user;
   * }
   */
  customHookNames: Set<string>;
}