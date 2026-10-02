export interface HookLibraryDefinition {
  /**
   * Package names that provide hooks.
   *
   * Example:
   * ["react-router", "react-router-dom"]
   */
  packages: readonly string[];

  /**
   * Known hook names exported by the package.
   */
  hooks: ReadonlySet<string>;
}

/**
 * React's built-in hooks.
 *
 * Keep this list explicit instead of using `name.startsWith("use")`.
 *
 * This prevents arbitrary functions such as:
 *
 * import { useSomething } from "react";
 *
 * from automatically becoming hooks.
 */
export const REACT_BUILT_IN_HOOKS = new Set<string>([
  "useState",
  "useEffect",
  "useContext",
  "useReducer",
  "useCallback",
  "useMemo",
  "useRef",
  "useImperativeHandle",
  "useLayoutEffect",
  "useInsertionEffect",
  "useDebugValue",
  "useId",
  "useSyncExternalStore",
  "useTransition",
  "useDeferredValue",
  "useOptimistic",
  "useActionState",
  "use",
]);

/**
 * React Router hooks.
 *
 * React Router applications may import these from either
 * "react-router" or "react-router-dom", depending on the
 * application/version.
 */
export const REACT_ROUTER_HOOKS = new Set<string>([
  "useNavigate",
  "useLocation",
  "useParams",
  "useSearchParams",
  "useMatch",
  "useMatches",
  "useNavigation",
  "useNavigationType",
  "useOutlet",
  "useOutletContext",
  "useResolvedPath",
  "useHref",
  "useInRouterContext",
  "useLoaderData",
  "useRouteLoaderData",
  "useActionData",
  "useFetcher",
  "useFetchers",
  "useRevalidator",
  "useBeforeUnload",
  "useBlocker",
  "usePrompt",
]);

/**
 * Other hook libraries can be added here as CodeLens encounters
 * them in real repositories.
 *
 * Do not attempt to enumerate every hook library in existence.
 * The registry should grow based on actual supported frameworks/
 * libraries that CodeLens understands.
 */
export const HOOK_LIBRARIES: readonly HookLibraryDefinition[] = [
  {
    packages: ["react-router", "react-router-dom"],
    hooks: REACT_ROUTER_HOOKS,
  },

  {
    packages: ["react-redux"],
    hooks: new Set([
      "useSelector",
      "useDispatch",
      "useStore",
      "useSyncExternalStoreWithSelector",
    ]),
  },

  {
    packages: ["react-hook-form"],
    hooks: new Set([
      "useForm",
      "useFormContext",
      "useFormState",
      "useWatch",
      "useController",
      "useFieldArray",
    ]),
  },

  {
    packages: ["@tanstack/react-query"],
    hooks: new Set([
      "useQuery",
      "useQueries",
      "useMutation",
      "useInfiniteQuery",
      "useSuspenseQuery",
      "useSuspenseQueries",
      "useSuspenseInfiniteQuery",
      "useIsFetching",
      "useIsMutating",
      "useQueryClient",
    ]),
  },

  {
    packages: ["swr"],
    hooks: new Set([
      "useSWR",
      "useSWRImmutable",
      "useSWRConfig",
      "useSWRSubscription",
    ]),
  },

  {
    packages: ["@apollo/client"],
    hooks: new Set([
      "useQuery",
      "useLazyQuery",
      "useMutation",
      "useSubscription",
      "useApolloClient",
      "useReactiveVar",
    ]),
  },
];

export const findHookLibrary = (
  packageName: string
): HookLibraryDefinition | null => {
  return (
    HOOK_LIBRARIES.find((library) =>
      library.packages.includes(packageName)
    ) ?? null
  );
};