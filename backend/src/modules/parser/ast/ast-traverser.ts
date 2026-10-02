import {
  traverse,
  type NodePath,
} from "./babel-traverse.js";

import * as t from "@babel/types";

import type {
  ExpressContext,
  ReactHookContext,
} from "../parser.types.js";

import type {
  FileIR,
  IRCall,
  IRClass,
  IRClassMethod,
  IRComponent,
  IRExport,
  IRFunction,
  IRHook,
  IRImport,
  IRMongooseModel,
  IRMongooseSchema,
  IRRoute,
  SourceDiagnostic,
} from "../ir/ir.types.js";

import {
  getReturnTypeName,
  getSourceLocation,
  getParameters,
} from "./ast-utils.js";

import {
  getExpressionName,
} from "./ast-name-utils.js";

import {
  createIRNodeId,
} from "../ir/ir.ids.js";

import {
  extractCall,
} from "../extractors/call.extractor.js";

import {
  extractExpressRoute,
} from "../extractors/express.extractor.js";

import {
  createReactHookContext,
  extractFunctionComponent,
  extractReactHook,
} from "../extractors/react.extractor.js";

import {
  extractMongooseSchema,
  extractMongooseModel,
} from "../extractors/mongoose.extractor.js";
import {
  createMongooseContext,
} from "../extractors/mongoose-context.js";

export interface ASTTraversalResult {
  fileIR: FileIR;
  diagnostics: SourceDiagnostic[];
}

/* -------------------------------------------------------------------------- */
/* CLASS / EXPORT HELPERS                                                     */
/* -------------------------------------------------------------------------- */

const getMemberName = (
  node: t.ClassMethod
): string => {
  if (t.isIdentifier(node.key)) {
    return node.key.name;
  }

  if (t.isStringLiteral(node.key)) {
    return node.key.value;
  }

  if (t.isNumericLiteral(node.key)) {
    return String(node.key.value);
  }

  return "<computed>";
};

const getExportName = (
  node: t.Declaration
): string | undefined => {
  if (
    t.isFunctionDeclaration(node) ||
    t.isClassDeclaration(node)
  ) {
    return node.id?.name;
  }

  if (t.isVariableDeclaration(node)) {
    const declaration = node.declarations[0];

    if (
      declaration &&
      t.isIdentifier(declaration.id)
    ) {
      return declaration.id.name;
    }
  }

  return undefined;
};

/* -------------------------------------------------------------------------- */
/* COMMONJS HELPERS                                                           */
/* -------------------------------------------------------------------------- */

const isCommonJSRequire = (
  node: t.Expression
): node is t.CallExpression => {
  return (
    t.isCallExpression(node) &&
    t.isIdentifier(node.callee) &&
    node.callee.name === "require"
  );
};

const getRequireSource = (
  node: t.Expression | null | undefined
): string | null => {
  if (!node || !isCommonJSRequire(node)) {
    return null;
  }

  const argument = node.arguments[0];

  return t.isStringLiteral(argument)
    ? argument.value
    : null;
};

const isModuleExports = (
  node: t.Node
): boolean => {
  return (
    t.isMemberExpression(node) &&
    t.isIdentifier(node.object) &&
    node.object.name === "module" &&
    t.isIdentifier(node.property) &&
    node.property.name === "exports"
  );
};

/* -------------------------------------------------------------------------- */
/* EXPRESS CONTEXT                                                            */
/* -------------------------------------------------------------------------- */

const createExpressContext = (
  ast: t.File
): ExpressContext => {
  const context: ExpressContext = {
    expressFactoryNames: new Set<string>(),
    expressRouterNames: new Set<string>(),
  };

  /* ------------------------------------------------------------------------ */
  /* Imports / CommonJS bindings                                              */
  /* ------------------------------------------------------------------------ */

  for (const statement of ast.program.body) {
    if (t.isImportDeclaration(statement)) {
      const source = statement.source.value;

      if (source !== "express") {
        continue;
      }

      for (const specifier of statement.specifiers) {
        if (t.isImportDefaultSpecifier(specifier)) {
          context.expressFactoryNames.add(
            specifier.local.name
          );

          continue;
        }

        if (t.isImportNamespaceSpecifier(specifier)) {
          context.expressFactoryNames.add(
            specifier.local.name
          );

          continue;
        }

        if (t.isImportSpecifier(specifier)) {
          const importedName =
            t.isIdentifier(specifier.imported)
              ? specifier.imported.name
              : specifier.imported.value;

          if (importedName === "Router") {
            context.expressRouterNames.add(
              specifier.local.name
            );
          }
        }
      }

      continue;
    }

    if (!t.isVariableDeclaration(statement)) {
      continue;
    }

    for (const declaration of statement.declarations) {
      const source = getRequireSource(
        declaration.init
      );

      if (source !== "express") {
        continue;
      }

      if (t.isIdentifier(declaration.id)) {
        context.expressFactoryNames.add(
          declaration.id.name
        );

        continue;
      }

      if (t.isObjectPattern(declaration.id)) {
        for (const property of declaration.id.properties) {
          if (!t.isObjectProperty(property)) {
            continue;
          }

          const importedName =
            t.isIdentifier(property.key)
              ? property.key.name
              : t.isStringLiteral(property.key)
                ? property.key.value
                : null;

          if (importedName !== "Router") {
            continue;
          }

          if (t.isIdentifier(property.value)) {
            context.expressRouterNames.add(
              property.value.name
            );
          }
        }
      }
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Derived Express bindings                                                 */
  /* ------------------------------------------------------------------------ */

  for (const statement of ast.program.body) {
    if (!t.isVariableDeclaration(statement)) {
      continue;
    }

    for (const declaration of statement.declarations) {
      if (!t.isIdentifier(declaration.id)) {
        continue;
      }

      const init = declaration.init;

      if (!t.isCallExpression(init)) {
        continue;
      }

      const callee = getExpressionName(
        init.callee
      );

      /*
       * const app = express();
       */
      if (
        t.isIdentifier(init.callee) &&
        context.expressFactoryNames.has(
          init.callee.name
        )
      ) {
        context.expressRouterNames.delete(
          declaration.id.name
        );

        context.expressFactoryNames.add(
          declaration.id.name
        );

        continue;
      }

      /*
       * const router = express.Router();
       */
      if (
        callee &&
        t.isMemberExpression(init.callee) &&
        !init.callee.computed &&
        t.isIdentifier(init.callee.object) &&
        context.expressFactoryNames.has(
          init.callee.object.name
        ) &&
        t.isIdentifier(init.callee.property) &&
        init.callee.property.name === "Router"
      ) {
        context.expressRouterNames.add(
          declaration.id.name
        );
      }

      /*
       * const childRouter = router();
       */
      if (
        t.isIdentifier(init.callee) &&
        context.expressRouterNames.has(
          init.callee.name
        )
      ) {
        context.expressRouterNames.add(
          declaration.id.name
        );
      }
    }
  }

  return context;
};

/* -------------------------------------------------------------------------- */
/* AST TRAVERSAL                                                              */
/* -------------------------------------------------------------------------- */

export const traverseAST = (
  ast: t.File,
  filePath: string,
  language: "javascript" | "typescript"
): ASTTraversalResult => {
  const imports: IRImport[] = [];
  const exports: IRExport[] = [];
  const functions: IRFunction[] = [];
  const classes: IRClass[] = [];
  const calls: IRCall[] = [];
  const routes: IRRoute[] = [];
  const components: IRComponent[] = [];
  const hooks: IRHook[] = [];
  const mongooseSchemas: IRMongooseSchema[] = [];
  const mongooseModels: IRMongooseModel[] = [];
  const diagnostics: SourceDiagnostic[] = [];

  /*
   * Build semantic contexts once before traversal.
   *
   * The traverser itself does not need to know which libraries
   * expose hooks.
   */
  const expressContext = createExpressContext(ast);

  const reactHookContext =
    createReactHookContext(ast);
  
  const mongooseContext =
  createMongooseContext(ast);

  traverse(ast, {
    /* ---------------------------------------------------------------------- */
    /* IMPORTS                                                                 */
    /* ---------------------------------------------------------------------- */

    ImportDeclaration(
      path: NodePath<t.ImportDeclaration>
    ) {
      const node = path.node;
      const source = node.source.value;

      /*
       * import "module";
       */
      if (node.specifiers.length === 0) {
        const location = getSourceLocation(
          node,
          filePath
        );

        imports.push({
          id: createIRNodeId(
            "import",
            location
          ),
          kind: "import",
          location,
          source,
          importKind: "side-effect",
        });

        return;
      }

      for (const specifier of node.specifiers) {
        const location = getSourceLocation(
          specifier,
          filePath
        );

        /* ------------------------------------------------------------------ */
        /* Default import                                                      */
        /* ------------------------------------------------------------------ */

        if (t.isImportDefaultSpecifier(specifier)) {
          imports.push({
            id: createIRNodeId(
              "import",
              location
            ),
            kind: "import",
            location,
            source,
            importKind: "default",
            localName: specifier.local.name,
          });

          continue;
        }

        /* ------------------------------------------------------------------ */
        /* Namespace import                                                    */
        /* ------------------------------------------------------------------ */

        if (t.isImportNamespaceSpecifier(specifier)) {
          imports.push({
            id: createIRNodeId(
              "import",
              location
            ),
            kind: "import",
            location,
            source,
            importKind: "namespace",
            localName: specifier.local.name,
          });

          continue;
        }

        /* ------------------------------------------------------------------ */
        /* Named import                                                        */
        /* ------------------------------------------------------------------ */

        if (t.isImportSpecifier(specifier)) {
          const importedName =
            t.isIdentifier(specifier.imported)
              ? specifier.imported.name
              : specifier.imported.value;

          imports.push({
            id: createIRNodeId(
              "import",
              location
            ),
            kind: "import",
            location,
            source,
            importKind: "named",
            importedName,
            localName: specifier.local.name,
          });
        }
      }
    },

    /* ---------------------------------------------------------------------- */
    /* DEFAULT EXPORTS                                                        */
    /* ---------------------------------------------------------------------- */

    ExportDefaultDeclaration(
      path: NodePath<t.ExportDefaultDeclaration>
    ) {
      const node = path.node;

      const location = getSourceLocation(
        node,
        filePath
      );

      let name: string | undefined;

      if (t.isIdentifier(node.declaration)) {
        name = node.declaration.name;
      }

      if (
        t.isFunctionDeclaration(
          node.declaration
        )
      ) {
        name =
          node.declaration.id?.name;
      }

      if (
        t.isClassDeclaration(
          node.declaration
        )
      ) {
        name =
          node.declaration.id?.name;
      }

      exports.push({
        id: createIRNodeId(
          "export",
          location
        ),
        kind: "export",
        location,
        exportKind: "default",
        name,
      });
    },

    /* ---------------------------------------------------------------------- */
    /* NAMED EXPORTS                                                           */
    /* ---------------------------------------------------------------------- */

    ExportNamedDeclaration(
      path: NodePath<t.ExportNamedDeclaration>
    ) {
      const node = path.node;

      const location = getSourceLocation(
        node,
        filePath
      );

      if (node.declaration) {
        const name =
          getExportName(node.declaration);

        exports.push({
          id: createIRNodeId(
            "export",
            location
          ),
          kind: "export",
          location,
          exportKind: "named",
          name,
        });

        return;
      }

      for (const specifier of node.specifiers) {
        const specifierLocation =
          getSourceLocation(
            specifier,
            filePath
          );

        const name =
          t.isIdentifier(specifier.exported)
            ? specifier.exported.name
            : specifier.exported.value;

        exports.push({
          id: createIRNodeId(
            "export",
            specifierLocation
          ),
          kind: "export",
          location: specifierLocation,
          exportKind: "named",
          name,
        });
      }
    },

    /* ---------------------------------------------------------------------- */
    /* VARIABLE DECLARATIONS                                                   */
    /* ---------------------------------------------------------------------- */

    VariableDeclarator(
      path: NodePath<t.VariableDeclarator>
    ) {
      const node = path.node;

      if (!t.isIdentifier(node.id)) {
        return;
      }

      const init = node.init;

      if (!init) {
        return;
      }

      /* -------------------------------------------------------------------- */
      /* CommonJS import                                                       */
      /* -------------------------------------------------------------------- */

      if (isCommonJSRequire(init)) {
        const argument = init.arguments[0];

        if (t.isStringLiteral(argument)) {
          const location = getSourceLocation(
            node,
            filePath
          );

          imports.push({
            id: createIRNodeId(
              "import",
              location
            ),
            kind: "import",
            location,
            source: argument.value,
            importKind: "commonjs",
            localName: node.id.name,
          });
        }
      }

      /* -------------------------------------------------------------------- */
      /* Function / arrow function                                             */
      /* -------------------------------------------------------------------- */

      const functionNode =
        t.isArrowFunctionExpression(init) ||
        t.isFunctionExpression(init)
          ? init
          : null;

      if (functionNode) {
        const location =
          getSourceLocation(
            functionNode,
            filePath
          );

        functions.push({
          id: createIRNodeId(
            "function",
            location
          ),
          kind: "function",
          location,
          name: node.id.name,
          async: functionNode.async,
          generator:
            t.isFunctionExpression(
              functionNode
            )
              ? functionNode.generator
              : false,
          parameters:
            getParameters(
              functionNode.params
            ),
          returnType:
            getReturnTypeName(
              functionNode
            ),
        });
      }

      /* -------------------------------------------------------------------- */
      /* React component                                                       */
      /* -------------------------------------------------------------------- */

      const component =
        extractFunctionComponent(
          path,
          filePath
        );

      if (component) {
        components.push(component);
      }

      /* -------------------------------------------------------------------- */
      /* Mongoose schema                                                       */
      /* -------------------------------------------------------------------- */

      const mongooseSchema =
          extractMongooseSchema(
          path,
          filePath,
          mongooseContext
          );

      if (mongooseSchema) {
        mongooseSchemas.push(
          mongooseSchema
        );
      }
    },

    /* ---------------------------------------------------------------------- */
    /* FUNCTION DECLARATIONS                                                   */
    /* ---------------------------------------------------------------------- */

    FunctionDeclaration(
      path: NodePath<t.FunctionDeclaration>
    ) {
      const node = path.node;

      const location = getSourceLocation(
        node,
        filePath
      );

      functions.push({
        id: createIRNodeId(
          "function",
          location
        ),
        kind: "function",
        location,
        name: node.id?.name ?? null,
        async: node.async,
        generator: node.generator,
        parameters:
          getParameters(node.params),
        returnType:
          getReturnTypeName(node),
      });

      const component =
        extractFunctionComponent(
          path,
          filePath
        );

      if (component) {
        components.push(component);
      }
    },

    /* ---------------------------------------------------------------------- */
    /* CLASSES                                                                 */
    /* ---------------------------------------------------------------------- */

    ClassDeclaration(
      path: NodePath<t.ClassDeclaration>
    ) {
      const node = path.node;

      const location = getSourceLocation(
        node,
        filePath
      );

      const methods: IRClassMethod[] = [];

      for (const member of node.body.body) {
        if (!t.isClassMethod(member)) {
          continue;
        }

        const methodLocation =
          getSourceLocation(
            member,
            filePath
          );

        methods.push({
          name: getMemberName(member),
          async: member.async,
          static: member.static,
          parameters:
            getParameters(
              member.params
            ),
          returnType:
            getReturnTypeName(member),
          location: methodLocation,
        });
      }

      classes.push({
        id: createIRNodeId(
          "class",
          location
        ),
        kind: "class",
        location,
        name: node.id?.name ?? null,
        abstract: node.abstract ?? false,
        methods,
      });
    },

    /* ---------------------------------------------------------------------- */
    /* CALL EXPRESSIONS                                                        */
    /* ---------------------------------------------------------------------- */

    CallExpression(
      path: NodePath<t.CallExpression>
    ) {
      /* -------------------------------------------------------------------- */
      /* Generic call                                                          */
      /* -------------------------------------------------------------------- */

      const call = extractCall(
        path,
        filePath
      );

      if (call) {
        calls.push(call);
      }

      /* -------------------------------------------------------------------- */
      /* Express route                                                         */
      /* -------------------------------------------------------------------- */

      const route = extractExpressRoute(
        path,
        filePath,
        expressContext
      );

      if (route) {
        routes.push(route);
      }

      /* -------------------------------------------------------------------- */
      /* React / third-party / custom hook                                     */
      /* -------------------------------------------------------------------- */

      const hook = extractReactHook(
        path,
        filePath,
        reactHookContext
      );

      if (hook) {
        hooks.push(hook);
      }

      /* -------------------------------------------------------------------- */
      /* Mongoose model                                                        */
      /* -------------------------------------------------------------------- */

      const mongooseModel =
        extractMongooseModel(
        path,
        filePath,
        mongooseContext
      );

      if (mongooseModel) {
        mongooseModels.push(
          mongooseModel
        );
      }
    },

    /* ---------------------------------------------------------------------- */
    /* COMMONJS EXPORTS                                                        */
    /* ---------------------------------------------------------------------- */

    AssignmentExpression(
      path: NodePath<t.AssignmentExpression>
    ) {
      const node = path.node;

      /* -------------------------------------------------------------------- */
      /* module.exports = ...                                                  */
      /* -------------------------------------------------------------------- */

      if (isModuleExports(node.left)) {
        const location = getSourceLocation(
          node,
          filePath
        );

        const name =
          t.isIdentifier(node.right)
            ? node.right.name
            : undefined;

        exports.push({
          id: createIRNodeId(
            "export",
            location
          ),
          kind: "export",
          location,
          exportKind: "commonjs",
          name,
        });

        return;
      }

      /* -------------------------------------------------------------------- */
      /* exports.foo = ...                                                     */
      /* -------------------------------------------------------------------- */

      if (
        t.isMemberExpression(node.left) &&
        t.isIdentifier(node.left.object) &&
        node.left.object.name === "exports"
      ) {
        const location =
          getSourceLocation(
            node,
            filePath
          );

        const name =
          t.isIdentifier(node.left.property)
            ? node.left.property.name
            : undefined;

        exports.push({
          id: createIRNodeId(
            "export",
            location
          ),
          kind: "export",
          location,
          exportKind: "commonjs",
          name,
        });
      }
    },
  });

  /* ------------------------------------------------------------------------ */
  /* RESULT                                                                   */
  /* ------------------------------------------------------------------------ */

  return {
    fileIR: {
      path: filePath,
      language,
      imports,
      exports,
      functions,
      classes,
      calls,
      routes,
      components,
      hooks,
      mongooseSchemas,
      mongooseModels,
      diagnostics,
    },

    diagnostics,
  };
};