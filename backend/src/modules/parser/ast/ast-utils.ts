import * as t from "@babel/types";

import { toPortablePath } from "../../../common/utils/path.utils.js";
import type {
  IRParameter,
  SourceLocation,
} from "../ir/ir.types.js";

export const getSourceLocation = (
  node: t.Node,
  filePath: string
): SourceLocation => {
  return {
    file: toPortablePath(filePath),
    start: {
      line: node.loc?.start.line ?? 0,
      column: node.loc?.start.column ?? 0,
    },
    end: {
      line: node.loc?.end.line ?? 0,
      column: node.loc?.end.column ?? 0,
    },
  };
};

export const normalizeTypeNode = (
  typeNode: t.TSType
): string => {
  if (t.isTSStringKeyword(typeNode)) return "string";
  if (t.isTSNumberKeyword(typeNode)) return "number";
  if (t.isTSBooleanKeyword(typeNode)) return "boolean";
  if (t.isTSAnyKeyword(typeNode)) return "any";
  if (t.isTSUnknownKeyword(typeNode)) return "unknown";
  if (t.isTSVoidKeyword(typeNode)) return "void";
  if (t.isTSNeverKeyword(typeNode)) return "never";
  if (t.isTSNullKeyword(typeNode)) return "null";
  if (t.isTSUndefinedKeyword(typeNode)) return "undefined";
  if (t.isTSObjectKeyword(typeNode)) return "object";
  if (t.isTSSymbolKeyword(typeNode)) return "symbol";
  if (t.isTSBigIntKeyword(typeNode)) return "bigint";

  if (t.isTSTypeReference(typeNode)) {
    return getTypeReferenceName(typeNode);
  }

  if (t.isTSArrayType(typeNode)) {
    return `${normalizeTypeNode(typeNode.elementType)}[]`;
  }

  if (t.isTSUnionType(typeNode)) {
    return typeNode.types.map(normalizeTypeNode).join(" | ");
  }

  if (t.isTSIntersectionType(typeNode)) {
    return typeNode.types.map(normalizeTypeNode).join(" & ");
  }

  if (t.isTSLiteralType(typeNode)) {
    return normalizeLiteralType(typeNode);
  }

  if (t.isTSFunctionType(typeNode)) {
    return "function";
  }

  if (t.isTSTupleType(typeNode)) {
    return `[${typeNode.elementTypes
      .map((element) =>
        t.isTSType(element) ? normalizeTypeNode(element) : "unknown"
      )
      .join(", ")}]`;
  }

  return "unknown";
};

const getTypeReferenceName = (
  typeNode: t.TSTypeReference
): string => {
  return getEntityName(typeNode.typeName);
};

const getEntityName = (
  node: t.TSEntityName
): string => {
  if (t.isIdentifier(node)) {
    return node.name;
  }

  return `${getEntityName(node.left)}.${node.right.name}`;
};

const normalizeLiteralType = (
  typeNode: t.TSLiteralType
): string => {
  const literal = typeNode.literal;

  if (t.isStringLiteral(literal)) {
    return JSON.stringify(literal.value);
  }

  if (t.isNumericLiteral(literal)) {
    return String(literal.value);
  }

  if (t.isBooleanLiteral(literal)) {
    return String(literal.value);
  }

  return "unknown";
};

const getParameterName = (
  parameter: t.Node
): string => {
  if (t.isIdentifier(parameter)) {
    return parameter.name;
  }

  if (
    t.isAssignmentPattern(parameter) &&
    t.isIdentifier(parameter.left)
  ) {
    return parameter.left.name;
  }

  if (t.isRestElement(parameter)) {
    if (t.isIdentifier(parameter.argument)) {
      return `...${parameter.argument.name}`;
    }

    return "...";
  }

  if (t.isObjectPattern(parameter)) {
    return "{...}";
  }

  if (t.isArrayPattern(parameter)) {
    return "[...]";
  }

  return "<unknown>";
};

export const getParameterType = (
  parameter: t.Node
): string | null => {
  if (!t.isIdentifier(parameter)) {
    return null;
  }

  const typeAnnotation = parameter.typeAnnotation;

  if (!typeAnnotation) {
    return null;
  }

  if (t.isTSTypeAnnotation(typeAnnotation)) {
    return normalizeTypeNode(typeAnnotation.typeAnnotation);
  }

  return null;
};

export const getParameters = (
  parameters:
    | t.FunctionDeclaration["params"]
    | t.FunctionExpression["params"]
    | t.ArrowFunctionExpression["params"]
    | t.ClassMethod["params"]
): IRParameter[] => {
  return parameters.map((parameter) => {
    const actualParameter = t.isTSParameterProperty(parameter)
      ? parameter.parameter
      : parameter;

    return {
      name: getParameterName(actualParameter),
      type: getParameterType(actualParameter),
    };
  });
};

export const getReturnTypeName = (
  node:
    | t.FunctionDeclaration
    | t.FunctionExpression
    | t.ArrowFunctionExpression
    | t.ClassMethod
): string | null => {
  const returnType = node.returnType;

  if (!returnType) {
    return null;
  }

  if (t.isTSTypeAnnotation(returnType)) {
    return normalizeTypeNode(returnType.typeAnnotation);
  }

  return null;
};
