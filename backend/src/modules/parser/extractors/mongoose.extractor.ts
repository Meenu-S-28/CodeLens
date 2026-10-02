import type { NodePath } from "../ast/babel-traverse.js";
import * as t from "@babel/types";

import {
  getExpressionName,
  getStaticStringValue,
} from "../ast/ast-name-utils.js";

import { getSourceLocation } from "../ast/ast-utils.js";

import { createIRNodeId } from "../ir/ir.ids.js";

import type {
  IRMongooseModel,
  IRMongooseSchema,
} from "../ir/ir.types.js";

import type {
  MongooseContext,
} from "./mongoose-context.js";

import {
  isMongooseModelReference,
  isMongooseSchemaReference,
} from "./mongoose-context.js";

/* -------------------------------------------------------------------------- */
/* SCHEMA FIELD HELPERS                                                       */
/* -------------------------------------------------------------------------- */

const getPropertyName = (
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

const getMongooseTypeName = (
  node: t.Node
): string | null => {
  if (t.isIdentifier(node)) {
    return node.name;
  }

  if (t.isMemberExpression(node)) {
    return getExpressionName(node);
  }

  return null;
};

const extractSchemaFields = (
  node: t.Node
): Record<string, string> => {
  const fields: Record<string, string> = {};

  if (!t.isObjectExpression(node)) {
    return fields;
  }

  for (const property of node.properties) {
    if (!t.isObjectProperty(property)) {
      continue;
    }

    const name = getPropertyName(property);

    if (!name) {
      continue;
    }

    /* ---------------------------------------------------------------------- */
    /* Simple field                                                           */
    /*                                                                        */
    /* name: String                                                           */
    /* ---------------------------------------------------------------------- */

    const type = getMongooseTypeName(
      property.value
    );

    if (type) {
      fields[name] = type;
      continue;
    }

    /* ---------------------------------------------------------------------- */
    /* Field configuration object                                             */
    /*                                                                        */
    /* name: { type: String, required: true }                                */
    /* ---------------------------------------------------------------------- */

    if (
      !t.isObjectExpression(
        property.value
      )
    ) {
      continue;
    }

    const typeProperty =
      property.value.properties.find(
        (nested) =>
          t.isObjectProperty(nested) &&
          getPropertyName(nested) === "type"
      );

    if (
      typeProperty &&
      t.isObjectProperty(typeProperty)
    ) {
      const nestedType =
        getMongooseTypeName(
          typeProperty.value
        );

      if (nestedType) {
        fields[name] = nestedType;
      }
    }
  }

  return fields;
};

/* -------------------------------------------------------------------------- */
/* MONGOOSE SCHEMA                                                            */
/* -------------------------------------------------------------------------- */

export const extractMongooseSchema = (
  path: NodePath<t.VariableDeclarator>,
  filePath: string,
  context: MongooseContext
): IRMongooseSchema | null => {
  const node = path.node;

  if (!t.isIdentifier(node.id)) {
    return null;
  }

  const init = node.init;

  if (!init) {
    return null;
  }

  let schemaDefinition:
    | t.Expression
    | null = null;

  let locationNode:
    | t.NewExpression
    | t.CallExpression
    | null = null;

  /* ------------------------------------------------------------------------ */
  /* new mongoose.Schema({...})                                               */
  /* new Schema({...})                                                        */
  /* ------------------------------------------------------------------------ */

  if (t.isNewExpression(init)) {
    if (
      !isMongooseSchemaReference(
        init.callee,
        context
      )
    ) {
      return null;
    }

    const argument = init.arguments[0];

    if (
      !argument ||
      !t.isExpression(argument)
    ) {
      return null;
    }

    schemaDefinition = argument;
    locationNode = init;
  }

  /* ------------------------------------------------------------------------ */
  /* mongoose.Schema({...})                                                   */
  /* Schema({...})                                                            */
  /* ------------------------------------------------------------------------ */

  else if (t.isCallExpression(init)) {
    if (
      !isMongooseSchemaReference(
        init.callee,
        context
      )
    ) {
      return null;
    }

    const argument = init.arguments[0];

    if (
      !argument ||
      !t.isExpression(argument)
    ) {
      return null;
    }

    schemaDefinition = argument;
    locationNode = init;
  }

  else {
    return null;
  }

  const location = getSourceLocation(
    locationNode,
    filePath
  );

  return {
    id: createIRNodeId(
      "mongoose-schema",
      location
    ),
    kind: "mongoose-schema",
    location,
    name: node.id.name,
    fields: extractSchemaFields(
      schemaDefinition
    ),
  };
};

/* -------------------------------------------------------------------------- */
/* MONGOOSE MODEL                                                             */
/* -------------------------------------------------------------------------- */

export const extractMongooseModel = (
  path: NodePath<t.CallExpression>,
  filePath: string,
  context: MongooseContext
): IRMongooseModel | null => {
  const node = path.node;

  if (
    !isMongooseModelReference(
      node.callee,
      context
    )
  ) {
    return null;
  }

  /* ------------------------------------------------------------------------ */
  /* mongoose.model() requires at least the model name                       */
  /* ------------------------------------------------------------------------ */

  if (node.arguments.length < 1) {
    return null;
  }

  const modelNameArgument =
    node.arguments[0];

  if (
    !modelNameArgument ||
    !t.isExpression(modelNameArgument)
  ) {
    return null;
  }

  const modelName =
    getStaticStringValue(
      modelNameArgument
    );

  if (!modelName) {
    return null;
  }

  /* ------------------------------------------------------------------------ */
  /* Optional schema argument                                                 */
  /*                                                                        */
  /* mongoose.model("User", userSchema)                                      */
  /* mongoose.model("User")                                                  */
  /* ------------------------------------------------------------------------ */

  const schemaArgument =
    node.arguments[1];

  const schema =
    schemaArgument &&
    t.isExpression(schemaArgument)
      ? getExpressionName(
          schemaArgument
        )
      : null;

  const location =
    getSourceLocation(
      node,
      filePath
    );

  return {
    id: createIRNodeId(
      "mongoose-model",
      location
    ),
    kind: "mongoose-model",
    location,
    name: modelName,
    schema,
    orm: "mongoose",
  };
};