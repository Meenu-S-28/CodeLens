// src/modules/parser/parser.constants.ts

import type {
  SupportedSourceExtension,
} from "./parser.types.js";

export const SUPPORTED_SOURCE_EXTENSIONS =
  new Set<SupportedSourceExtension>([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
  ]);

export const TYPESCRIPT_EXTENSIONS =
  new Set<SupportedSourceExtension>([
    ".ts",
    ".tsx",
  ]);

export const JSX_EXTENSIONS =
  new Set<SupportedSourceExtension>([
    ".jsx",
    ".tsx",
  ]);

export const EXPRESS_HTTP_METHODS =
  new Set([
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "head",
    "options",
  ]);

export const REACT_BUILT_IN_HOOKS =
  new Set([
    "useState",
    "useEffect",
    "useMemo",
    "useCallback",
    "useRef",
    "useContext",
    "useReducer",
    "useLayoutEffect",
    "useImperativeHandle",
    "useDebugValue",
    "useId",
    "useTransition",
    "useDeferredValue",
    "useSyncExternalStore",
    "useInsertionEffect",
  ]);