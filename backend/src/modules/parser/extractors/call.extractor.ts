// src/modules/parser/extractors/call.extractor.ts

import type { NodePath } from "../ast/babel-traverse.js";

import * as t from "@babel/types";

import {
  getExpressionName,
} from "../ast/ast-name-utils.js";

import {
  getSourceLocation,
} from "../ast/ast-utils.js";

import {
  createIRNodeId,
} from "../ir/ir.ids.js";

import type {
  IRCall,
} from "../ir/ir.types.js";

export const extractCall = (
  path: NodePath<t.CallExpression>,
  filePath: string
): IRCall | null => {
  const node = path.node;

  const callee =
    getExpressionName(
      node.callee
    );

  if (!callee) {
    return null;
  }

  const location =
    getSourceLocation(
      node,
      filePath
    );

  return {
    id: createIRNodeId(
      "call",
      location
    ),

    kind: "call",

    location,

    callee,

    argumentCount:
      node.arguments.length,
  };
};