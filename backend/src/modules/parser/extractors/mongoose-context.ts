import * as t from "@babel/types";

export interface MongooseContext {
  /**
   * Local identifiers that represent the Mongoose namespace.
   *
   * Examples:
   *   import mongoose from "mongoose";
   *   import * as mongoose from "mongoose";
   *   const mongoose = require("mongoose");
   */
  namespaceBindings: Set<string>;

  /**
   * Local identifiers that represent mongoose.Schema.
   *
   * Examples:
   *   import { Schema } from "mongoose";
   *   import { Schema as MongooseSchema } from "mongoose";
   *   const { Schema } = require("mongoose");
   */
  schemaBindings: Set<string>;

  /**
   * Local identifiers that represent mongoose.model.
   *
   * Examples:
   *   import { model } from "mongoose";
   *   import { model as createModel } from "mongoose";
   *   const { model } = require("mongoose");
   */
  modelBindings: Set<string>;
}

const MONGOOSE_PACKAGE = "mongoose";

const addNamedBinding = (
  context: MongooseContext,
  importedName: string,
  localName: string
): void => {
  if (importedName === "Schema") {
    context.schemaBindings.add(localName);
    return;
  }

  if (importedName === "model") {
    context.modelBindings.add(localName);
  }
};

const getPropertyKeyName = (
  property: t.ObjectProperty
): string | null => {
  if (
    t.isIdentifier(property.key) &&
    !property.computed
  ) {
    return property.key.name;
  }

  if (
    t.isStringLiteral(property.key) &&
    !property.computed
  ) {
    return property.key.value;
  }

  return null;
};

const addCommonJSDestructuredBindings = (
  context: MongooseContext,
  pattern: t.ObjectPattern
): void => {
  for (const property of pattern.properties) {
    if (!t.isObjectProperty(property)) {
      continue;
    }

    const importedName = getPropertyKeyName(property);

    if (!importedName) {
      continue;
    }

    if (!t.isIdentifier(property.value)) {
      continue;
    }

    addNamedBinding(
      context,
      importedName,
      property.value.name
    );
  }
};

const isMongooseRequire = (
  init: t.Node | null | undefined
): boolean => {
  return (
    t.isCallExpression(init) &&
    t.isIdentifier(init.callee) &&
    init.callee.name === "require" &&
    init.arguments.length === 1 &&
    t.isStringLiteral(init.arguments[0]) &&
    init.arguments[0].value === MONGOOSE_PACKAGE
  );
};

export const createMongooseContext = (
  ast: t.File
): MongooseContext => {
  const context: MongooseContext = {
    namespaceBindings: new Set<string>(),
    schemaBindings: new Set<string>(),
    modelBindings: new Set<string>(),
  };

  for (const statement of ast.program.body) {
    /* ---------------------------------------------------------------------- */
    /* ES MODULE IMPORTS                                                      */
    /* ---------------------------------------------------------------------- */

    if (t.isImportDeclaration(statement)) {
      if (
        statement.source.value !==
        MONGOOSE_PACKAGE
      ) {
        continue;
      }

      for (const specifier of statement.specifiers) {
        /* ------------------------------------------------------------------ */
        /* import mongoose from "mongoose"                                   */
        /* ------------------------------------------------------------------ */

        if (
          t.isImportDefaultSpecifier(specifier)
        ) {
          context.namespaceBindings.add(
            specifier.local.name
          );

          continue;
        }

        /* ------------------------------------------------------------------ */
        /* import * as mongoose from "mongoose"                              */
        /* ------------------------------------------------------------------ */

        if (
          t.isImportNamespaceSpecifier(specifier)
        ) {
          context.namespaceBindings.add(
            specifier.local.name
          );

          continue;
        }

        /* ------------------------------------------------------------------ */
        /* import { Schema } from "mongoose"                                 */
        /* import { model as createModel } from "mongoose"                   */
        /* ------------------------------------------------------------------ */

        if (t.isImportSpecifier(specifier)) {
          const importedName =
            t.isIdentifier(specifier.imported)
              ? specifier.imported.name
              : specifier.imported.value;

          addNamedBinding(
            context,
            importedName,
            specifier.local.name
          );
        }
      }

      continue;
    }

    /* ---------------------------------------------------------------------- */
    /* COMMONJS REQUIRE                                                       */
    /* ---------------------------------------------------------------------- */

    if (!t.isVariableDeclaration(statement)) {
      continue;
    }

    for (const declaration of statement.declarations) {
      if (!isMongooseRequire(declaration.init)) {
        continue;
      }

      /* -------------------------------------------------------------------- */
      /* const mongoose = require("mongoose")                                */
      /* -------------------------------------------------------------------- */

      if (t.isIdentifier(declaration.id)) {
        context.namespaceBindings.add(
          declaration.id.name
        );

        continue;
      }

      /* -------------------------------------------------------------------- */
      /* const { Schema, model } = require("mongoose")                       */
      /* -------------------------------------------------------------------- */

      if (t.isObjectPattern(declaration.id)) {
        addCommonJSDestructuredBindings(
          context,
          declaration.id
        );
      }
    }
  }

  return context;
};

export const isMongooseNamespaceMember = (
  node: t.Node | null | undefined,
  context: MongooseContext,
  propertyName: "Schema" | "model"
): boolean => {
  if (!t.isMemberExpression(node)) {
    return false;
  }

  if (node.computed) {
    return false;
  }

  if (!t.isIdentifier(node.object)) {
    return false;
  }

  if (!t.isIdentifier(node.property)) {
    return false;
  }

  return (
    context.namespaceBindings.has(
      node.object.name
    ) &&
    node.property.name === propertyName
  );
};

export const isMongooseSchemaReference = (
  node: t.Node | null | undefined,
  context: MongooseContext
): boolean => {
  if (
    t.isIdentifier(node) &&
    context.schemaBindings.has(node.name)
  ) {
    return true;
  }

  return isMongooseNamespaceMember(
    node,
    context,
    "Schema"
  );
};

export const isMongooseModelReference = (
  node: t.Node | null | undefined,
  context: MongooseContext
): boolean => {
  if (
    t.isIdentifier(node) &&
    context.modelBindings.has(node.name)
  ) {
    return true;
  }

  return isMongooseNamespaceMember(
    node,
    context,
    "model"
  );
};