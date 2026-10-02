import type { NodePath } from "../ast/babel-traverse.js";
import * as t from "@babel/types";

import { EXPRESS_HTTP_METHODS } from "../parser.constants.js";
import type { ExpressContext } from "../parser.types.js";
import {
  getExpressionName,
  getStaticStringValue,
} from "../ast/ast-name-utils.js";
import { getSourceLocation } from "../ast/ast-utils.js";
import { createIRNodeId } from "../ir/ir.ids.js";
import type { IRRoute } from "../ir/ir.types.js";

const isExpressReceiver = (
  receiver: t.Node,
  context: ExpressContext
): boolean => {
  if (!t.isIdentifier(receiver)) {
    return false;
  }

  return (
    context.expressFactoryNames.has(receiver.name) ||
    context.expressRouterNames.has(receiver.name)
  );
};

export const extractExpressRoute = (
  path: NodePath<t.CallExpression>,
  filePath: string,
  context: ExpressContext
): IRRoute | null => {
  const node = path.node;

  if (!t.isMemberExpression(node.callee)) {
    return null;
  }

  if (node.callee.computed) {
    return null;
  }

  const router = getExpressionName(node.callee.object);
  const method = getExpressionName(node.callee.property);

  if (!router || !method) {
    return null;
  }

  if (!isExpressReceiver(node.callee.object, context)) {
    return null;
  }

  const normalizedMethod = method.toLowerCase();

  if (!EXPRESS_HTTP_METHODS.has(normalizedMethod)) {
    return null;
  }

  if (node.arguments.length === 0) {
    return null;
  }

  const pathArgument = node.arguments[0];

  if (!t.isExpression(pathArgument)) {
    return null;
  }

  const routePath = getStaticStringValue(pathArgument);

  if (!routePath) {
    return null;
  }

const remainingArguments = node.arguments.slice(1);

if (remainingArguments.length === 0) {
  return null;
}

const handlerArgument = remainingArguments.at(-1);

if (!handlerArgument || !t.isExpression(handlerArgument)) {
  return null;
}

const handler = getExpressionName(handlerArgument);

const middleware = remainingArguments
  .slice(0, -1)
  .map((argument) => {
    if (!t.isExpression(argument)) {
      return null;
    }

    return getExpressionName(argument);
  })
  .filter(
    (name): name is string => name !== null
  );

  const location = getSourceLocation(node, filePath);

  return {
    id: createIRNodeId("route", location),
    kind: "route",
    location,
    method: normalizedMethod.toUpperCase(),
    path: routePath,
    router,
    handler,
    middleware,
  };
};
