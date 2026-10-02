// src/modules/parser/ir/ir.ids.ts

import type {
  IRNodeKind,
  SourceLocation,
} from "./ir.types.js";

export const createIRNodeId = (
  kind: IRNodeKind,
  location: SourceLocation
): string => {
  return [
    kind,
    location.file,
    location.start.line,
    location.start.column,
  ].join(":");
};