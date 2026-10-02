import {
  createRequire,
} from "node:module";

import type {
  NodePath,
  TraverseOptions,
} from "@babel/traverse";

import type * as t from "@babel/types";

const require =
  createRequire(import.meta.url);

type BabelTraverseModule = {
  default: (
    parent: t.Node,
    opts?: TraverseOptions
  ) => void;
};

const babelTraverseModule =
  require("@babel/traverse") as BabelTraverseModule;

export const traverse =
  babelTraverseModule.default;

export type {
  NodePath,
};