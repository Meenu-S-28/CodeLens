import type { NodePath } from "../ast/babel-traverse.js";
import * as t from "@babel/types";

import type { ReactHookContext } from "../parser.types.js";

import {
  HOOK_LIBRARIES,
  REACT_BUILT_IN_HOOKS,
  findHookLibrary,
} from "../hook-library.registry.js";

import { getSourceLocation } from "../ast/ast-utils.js";
import { createIRNodeId } from "../ir/ir.ids.js";

import type {
  IRComponent,
  IRHook,
} from "../ir/ir.types.js";

/* -------------------------------------------------------------------------- */
/* JSX / COMPONENT DETECTION                                                  */
/* -------------------------------------------------------------------------- */

const containsJSX = (node: t.Node): boolean => {
  let found = false;

  const visit = (current: t.Node): void => {
    if (found) {
      return;
    }

    if (
      t.isJSXElement(current) ||
      t.isJSXFragment(current)
    ) {
      found = true;
      return;
    }

    for (const key of Object.keys(current)) {
      if (
        key === "loc" ||
        key === "start" ||
        key === "end" ||
        key === "tokens"
      ) {
        continue;
      }

      const value = (
        current as unknown as Record<string, unknown>
      )[key];

      if (Array.isArray(value)) {
        for (const item of value) {
          if (t.isNode(item)) {
            visit(item);
          }

          if (found) {
            return;
          }
        }
      } else if (t.isNode(value)) {
        visit(value);
      }

      if (found) {
        return;
      }
    }
  };

  visit(node);

  return found;
};

const isComponentName = (name: string): boolean => {
  return /^[A-Z]/.test(name);
};

export const extractFunctionComponent = (
  path:
    | NodePath<t.FunctionDeclaration>
    | NodePath<t.VariableDeclarator>,
  filePath: string
): IRComponent | null => {
  const node = path.node;

  let functionNode:
    | t.FunctionDeclaration
    | t.ArrowFunctionExpression
    | t.FunctionExpression
    | null = null;

  let name: string | null = null;
  let style: IRComponent["style"] | null = null;

  if (t.isFunctionDeclaration(node)) {
    functionNode = node;
    name = node.id?.name ?? null;
    style = "function";
  }

  if (
    t.isVariableDeclarator(node) &&
    t.isIdentifier(node.id)
  ) {
    if (t.isArrowFunctionExpression(node.init)) {
      functionNode = node.init;
      name = node.id.name;
      style = "arrow";
    }

    if (t.isFunctionExpression(node.init)) {
      functionNode = node.init;
      name = node.id.name;
      style = "function-expression";
    }
  }

  if (!functionNode || !name || !style) {
    return null;
  }

  if (!isComponentName(name)) {
    return null;
  }

  if (!containsJSX(functionNode)) {
    return null;
  }

  const location = getSourceLocation(
    functionNode,
    filePath
  );

  return {
    id: createIRNodeId("component", location),
    kind: "component",
    location,
    name,
    style,
  };
};

/* -------------------------------------------------------------------------- */
/* HOOK CONTEXT HELPERS                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Returns the imported name from an ES module ImportSpecifier.
 *
 * Examples:
 *
 * import { useState } from "react";
 *                  ^^^^^^^^^
 *
 * import { useState as state } from "react";
 *                  ^^^^^^^^^
 */
const getImportedSpecifierName = (
  specifier: t.ImportSpecifier
): string => {
  return t.isIdentifier(specifier.imported)
    ? specifier.imported.name
    : specifier.imported.value;
};

/**
 * Registers a React built-in hook only when it is explicitly
 * present in the known React hook registry.
 *
 * This intentionally does NOT use:
 *
 * importedName.startsWith("use")
 *
 * because that would classify arbitrary names as hooks.
 */
const registerReactHookImport = (
  context: ReactHookContext,
  importedName: string,
  localName: string
): void => {
  if (!REACT_BUILT_IN_HOOKS.has(importedName)) {
    return;
  }

  context.reactHookNames.add(localName);
};

/**
 * Registers a hook imported from a known third-party hook library.
 *
 * Example:
 *
 * import {
 *   useNavigate
 * } from "react-router-dom";
 *
 * The local binding is stored because the AST sees the local name.
 */
const registerLibraryHookImport = (
  context: ReactHookContext,
  source: string,
  importedName: string,
  localName: string
): void => {
  const library = findHookLibrary(source);

  if (!library) {
    return;
  }

  if (!library.hooks.has(importedName)) {
    return;
  }

  context.libraryHookNames.add(localName);
};

/* -------------------------------------------------------------------------- */
/* HOOK CONTEXT CREATION                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Creates the hook context for a single source file.
 *
 * Supported:
 *
 * React:
 *   import { useState } from "react";
 *   import React from "react";
 *   import * as React from "react";
 *
 * React Router:
 *   import { useNavigate } from "react-router";
 *   import { useNavigate } from "react-router-dom";
 *   import * as Router from "react-router";
 *
 * CommonJS:
 *   const React = require("react");
 *   const { useState } = require("react");
 *   const { useNavigate } = require("react-router-dom");
 */
export const createReactHookContext = (
  ast: t.File
): ReactHookContext => {
  const context: ReactHookContext = {
    reactHookNames: new Set<string>(),
    reactNamespaceNames: new Set<string>(),
    libraryHookNames: new Set<string>(),
    libraryNamespaceNames: new Set<string>(),
    customHookNames: new Set<string>(),
  };

  for (const statement of ast.program.body) {
    /* ---------------------------------------------------------------------- */
    /* ES MODULE IMPORTS                                                       */
    /* ---------------------------------------------------------------------- */

    if (t.isImportDeclaration(statement)) {
      const source = statement.source.value;

      /* -------------------------------------------------------------------- */
      /* React                                                                  */
      /* -------------------------------------------------------------------- */

      if (source === "react") {
        for (const specifier of statement.specifiers) {
          /*
           * import React from "react";
           */
          if (t.isImportDefaultSpecifier(specifier)) {
            context.reactNamespaceNames.add(
              specifier.local.name
            );

            continue;
          }

          /*
           * import * as React from "react";
           */
          if (t.isImportNamespaceSpecifier(specifier)) {
            context.reactNamespaceNames.add(
              specifier.local.name
            );

            continue;
          }

          /*
           * import {
           *   useState,
           *   useEffect as effect
           * } from "react";
           */
          if (t.isImportSpecifier(specifier)) {
            const importedName =
              getImportedSpecifierName(specifier);

            registerReactHookImport(
              context,
              importedName,
              specifier.local.name
            );
          }
        }

        continue;
      }

      /* -------------------------------------------------------------------- */
      /* Recognized third-party hook libraries                                */
      /* -------------------------------------------------------------------- */

      const library = findHookLibrary(source);

      if (!library) {
        continue;
      }

      for (const specifier of statement.specifiers) {
        /*
         * import * as Router from "react-router";
         */
        if (t.isImportNamespaceSpecifier(specifier)) {
          context.libraryNamespaceNames.add(
            specifier.local.name
          );

          continue;
        }

        /*
         * import {
         *   useNavigate
         * } from "react-router-dom";
         */
        if (t.isImportSpecifier(specifier)) {
          const importedName =
            getImportedSpecifierName(specifier);

          registerLibraryHookImport(
            context,
            source,
            importedName,
            specifier.local.name
          );
        }
      }

      continue;
    }

    /* ---------------------------------------------------------------------- */
    /* CommonJS imports                                                        */
    /* ---------------------------------------------------------------------- */

    if (!t.isVariableDeclaration(statement)) {
      continue;
    }

    for (const declaration of statement.declarations) {
      const init = declaration.init;

      if (
        !t.isCallExpression(init) ||
        !t.isIdentifier(init.callee) ||
        init.callee.name !== "require"
      ) {
        continue;
      }

      const argument = init.arguments[0];

      if (!t.isStringLiteral(argument)) {
        continue;
      }

      const source = argument.value;

      /* -------------------------------------------------------------------- */
      /* React CommonJS                                                        */
      /* -------------------------------------------------------------------- */

      if (source === "react") {
        /*
         * const React = require("react");
         */
        if (t.isIdentifier(declaration.id)) {
          context.reactNamespaceNames.add(
            declaration.id.name
          );

          continue;
        }

        /*
         * const {
         *   useState,
         *   useEffect: effect
         * } = require("react");
         */
        if (t.isObjectPattern(declaration.id)) {
          for (const property of declaration.id.properties) {
            if (!t.isObjectProperty(property)) {
              continue;
            }

            const importedName =
              t.isIdentifier(property.key)
                ? property.key.name
                : t.isStringLiteral(property.key)
                  ? property.key.value
                  : null;

            if (!importedName) {
              continue;
            }

            if (!t.isIdentifier(property.value)) {
              continue;
            }

            registerReactHookImport(
              context,
              importedName,
              property.value.name
            );
          }
        }

        continue;
      }

      /* -------------------------------------------------------------------- */
      /* Third-party CommonJS hook libraries                                  */
      /* -------------------------------------------------------------------- */

      const library = findHookLibrary(source);

      if (!library) {
        continue;
      }

      /*
       * const Router = require("react-router");
       */
      if (t.isIdentifier(declaration.id)) {
        context.libraryNamespaceNames.add(
          declaration.id.name
        );

        continue;
      }

      /*
       * const {
       *   useNavigate
       * } = require("react-router-dom");
       */
      if (!t.isObjectPattern(declaration.id)) {
        continue;
      }

      for (const property of declaration.id.properties) {
        if (!t.isObjectProperty(property)) {
          continue;
        }

        const importedName =
          t.isIdentifier(property.key)
            ? property.key.name
            : t.isStringLiteral(property.key)
              ? property.key.value
              : null;

        if (!importedName) {
          continue;
        }

        if (!t.isIdentifier(property.value)) {
          continue;
        }

        registerLibraryHookImport(
          context,
          source,
          importedName,
          property.value.name
        );
      }
    }
  }

  /*
   * Custom hooks are determined only after all imported hook
   * bindings have been collected.
   */
  context.customHookNames =
    collectLocalCustomHookNames(
      ast,
      context
    );

  return context;
};

/* -------------------------------------------------------------------------- */
/* DIRECT HOOK CALL DETECTION                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Determines whether a call's callee represents a verified hook.
 *
 * Supported:
 *
 *   useState()
 *   useNavigate()
 *   useSelector()
 *   useAuth()
 *
 *   React.useState()
 *   Router.useNavigate()
 *
 * Not automatically classified:
 *
 *   useDatabase()
 *   useApi()
 *   useSomething()
 */
const isDirectReactHookCall = (
  callee: t.Node,
  context: ReactHookContext
): string | null => {
  /* ------------------------------------------------------------------------ */
  /* Direct identifier                                                        */
  /* ------------------------------------------------------------------------ */

  if (t.isIdentifier(callee)) {
    /*
     * React built-in hook.
     */
    if (context.reactHookNames.has(callee.name)) {
      return callee.name;
    }

    /*
     * Known third-party library hook.
     */
    if (context.libraryHookNames.has(callee.name)) {
      return callee.name;
    }

    /*
     * Verified local custom hook.
     */
    if (context.customHookNames.has(callee.name)) {
      return callee.name;
    }

    return null;
  }

  /* ------------------------------------------------------------------------ */
  /* Namespace member                                                         */
  /* ------------------------------------------------------------------------ */

  if (
    t.isMemberExpression(callee) &&
    !callee.computed &&
    t.isIdentifier(callee.object) &&
    t.isIdentifier(callee.property)
  ) {
    const namespaceName = callee.object.name;
    const hookName = callee.property.name;

    /*
     * React.useState()
     */
    if (
      context.reactNamespaceNames.has(namespaceName) &&
      REACT_BUILT_IN_HOOKS.has(hookName)
    ) {
      return hookName;
    }

    /*
     * Router.useNavigate()
     *
     * The namespace was registered only if it came from a
     * recognized hook library.
     */
    if (
      context.libraryNamespaceNames.has(namespaceName)
    ) {
      const isKnownLibraryHook =
        HOOK_LIBRARIES.some((library) =>
          library.hooks.has(hookName)
        );

      if (isKnownLibraryHook) {
        return hookName;
      }
    }
  }

  return null;
};

/* -------------------------------------------------------------------------- */
/* VERIFIED HOOK DETECTION INSIDE CUSTOM HOOKS                                */
/* -------------------------------------------------------------------------- */

/**
 * Determines whether a function contains a verified hook call.
 *
 * Custom hooks are NOT considered hooks merely because their
 * names start with "use".
 *
 * Example:
 *
 * function useDatabase() {
 *   return database.query();
 * }
 *
 * This will NOT be considered a custom hook.
 *
 * But:
 *
 * function useAuth() {
 *   const [user] = useState(null);
 *   return user;
 * }
 *
 * WILL be considered a custom hook.
 */
const containsVerifiedHook = (
  node: t.Node,
  context: ReactHookContext
): boolean => {
  let found = false;

  const visit = (current: t.Node): void => {
    if (found) {
      return;
    }

    if (t.isCallExpression(current)) {
      /*
       * Disable customHookNames while determining whether this
       * function itself contains a verified underlying hook.
       *
       * This prevents circular/self-referential classification.
       */
      const hookName = isDirectReactHookCall(
        current.callee,
        {
          ...context,
          customHookNames: new Set<string>(),
        }
      );

      if (hookName) {
        found = true;
        return;
      }
    }

    for (const key of Object.keys(current)) {
      if (
        key === "loc" ||
        key === "start" ||
        key === "end" ||
        key === "tokens"
      ) {
        continue;
      }

      const value = (
        current as unknown as Record<string, unknown>
      )[key];

      if (Array.isArray(value)) {
        for (const item of value) {
          if (t.isNode(item)) {
            visit(item);
          }

          if (found) {
            return;
          }
        }
      } else if (t.isNode(value)) {
        visit(value);
      }

      if (found) {
        return;
      }
    }
  };

  visit(node);

  return found;
};

/**
 * Finds local custom hooks.
 *
 * A local function is considered a custom hook only when:
 *
 * 1. Its name follows the React hook naming convention:
 *      useSomething
 *
 * 2. Its implementation contains a verified hook call.
 */
export const collectLocalCustomHookNames = (
  ast: t.File,
  context: ReactHookContext
): Set<string> => {
  const customHookNames = new Set<string>();

  const visitFunction = (
    node:
      | t.FunctionDeclaration
      | t.VariableDeclarator
  ): void => {
    let name: string | null = null;

    let functionNode:
      | t.FunctionDeclaration
      | t.ArrowFunctionExpression
      | t.FunctionExpression
      | null = null;

    /* ---------------------------------------------------------------------- */
    /* function useAuth() {}                                                   */
    /* ---------------------------------------------------------------------- */

    if (t.isFunctionDeclaration(node)) {
      name = node.id?.name ?? null;
      functionNode = node;
    }

    /* ---------------------------------------------------------------------- */
    /* const useAuth = () => {}                                                */
    /* const useAuth = function () {}                                          */
    /* ---------------------------------------------------------------------- */

    else if (
      t.isVariableDeclarator(node) &&
      t.isIdentifier(node.id) &&
      (
        t.isArrowFunctionExpression(node.init) ||
        t.isFunctionExpression(node.init)
      )
    ) {
      name = node.id.name;
      functionNode = node.init;
    }

    if (
      !name ||
      !/^use[A-Z0-9]/.test(name) ||
      !functionNode
    ) {
      return;
    }

    if (
      containsVerifiedHook(
        functionNode,
        context
      )
    ) {
      customHookNames.add(name);
    }
  };

  /*
   * We currently inspect top-level declarations.
   *
   * This is sufficient for Module 3 and avoids introducing
   * unnecessary scope-resolution complexity.
   */
  for (const statement of ast.program.body) {
    if (t.isFunctionDeclaration(statement)) {
      visitFunction(statement);
      continue;
    }

    if (t.isVariableDeclaration(statement)) {
      for (const declaration of statement.declarations) {
        visitFunction(declaration);
      }
    }
  }

  return customHookNames;
};

/* -------------------------------------------------------------------------- */
/* IR HOOK EXTRACTION                                                         */
/* -------------------------------------------------------------------------- */

export const extractReactHook = (
  path: NodePath<t.CallExpression>,
  filePath: string,
  context: ReactHookContext
): IRHook | null => {
  const hookName = isDirectReactHookCall(
    path.node.callee,
    context
  );

  if (!hookName) {
    return null;
  }

  const location = getSourceLocation(
    path.node,
    filePath
  );

  return {
    id: createIRNodeId("hook", location),
    kind: "hook",
    location,
    name: hookName,
  };
};