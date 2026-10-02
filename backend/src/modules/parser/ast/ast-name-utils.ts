// src/modules/parser/ast/ast-name-utils.ts

import * as t from "@babel/types";

export const getExpressionName = (
  node: t.Node | null | undefined
): string | null => {
  if (!node) {
    return null;
  }

  if (t.isIdentifier(node)) {
    return node.name;
  }

  if (t.isStringLiteral(node)) {
    return node.value;
  }

  if (t.isNumericLiteral(node)) {
    return String(node.value);
  }

  if (t.isMemberExpression(node)) {
    const objectName =
      getExpressionName(node.object);

    if (!objectName) {
      return null;
    }

    const propertyName =
      getExpressionName(node.property);

    if (!propertyName) {
      return null;
    }

    return `${objectName}.${propertyName}`;
  }

  if (t.isOptionalMemberExpression(node)) {
    const objectName =
      getExpressionName(node.object);

    if (!objectName) {
      return null;
    }

    const propertyName =
      getExpressionName(node.property);

    if (!propertyName) {
      return null;
    }

    return `${objectName}.${propertyName}`;
  }

  if (t.isThisExpression(node)) {
    return "this";
  }

  return null;
};

export const getStaticStringValue = (
  node: t.Node | null | undefined
): string | null => {
  if (t.isStringLiteral(node)) {
    return node.value;
  }

  if (
    t.isTemplateLiteral(node) &&
    node.expressions.length === 0 &&
    node.quasis.length === 1
  ) {
    return node.quasis[0]?.value.cooked ?? null;
  }

  return null;
};

export const isMemberExpressionNamed = (
  node: t.Node | null | undefined,
  objectName: string,
  propertyName: string
): boolean => {
  if (!t.isMemberExpression(node)) {
    return false;
  }

  if (!t.isIdentifier(node.object)) {
    return false;
  }

  if (!t.isIdentifier(node.property)) {
    return false;
  }

  return (
    node.object.name === objectName &&
    node.property.name === propertyName
  );
};