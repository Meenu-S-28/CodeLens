// src/modules/parser/ir/ir.types.ts

export interface SourcePosition {
  line: number;
  column: number;
}

export interface SourceLocation {
  file: string;

  start: SourcePosition;

  end: SourcePosition;
}

export type SourceDiagnosticSeverity =
  | "ERROR"
  | "WARNING";

export interface SourceDiagnostic {
  code: string;

  message: string;

  severity: SourceDiagnosticSeverity;

  file: string;

  location?: SourceLocation;
}

export type IRNodeKind =
  | "import"
  | "export"
  | "function"
  | "class"
  | "call"
  | "route"
  | "component"
  | "hook"
  | "mongoose-schema"
  | "mongoose-model";

export interface IRNodeBase {
  id: string;

  kind: IRNodeKind;

  location: SourceLocation;
}

export interface IRImport extends IRNodeBase {
  kind: "import";

  source: string;

  importKind:
    | "default"
    | "named"
    | "namespace"
    | "side-effect"
    | "commonjs";

  importedName?: string;

  localName?: string;
}

export interface IRExport extends IRNodeBase {
  kind: "export";

  exportKind:
    | "default"
    | "named"
    | "commonjs";

  name?: string;
}

export interface IRParameter {
  name: string;

  type: string | null;
}

export interface IRFunction extends IRNodeBase {
  kind: "function";

  name: string | null;

  async: boolean;

  generator: boolean;

  parameters: IRParameter[];

  returnType: string | null;
}

export interface IRClassMethod {
  name: string;

  async: boolean;

  static: boolean;

  parameters: IRParameter[];

  returnType: string | null;

  location: SourceLocation;
}

export interface IRClass extends IRNodeBase {
  kind: "class";

  name: string | null;

  abstract: boolean;

  methods: IRClassMethod[];
}

export interface IRCall extends IRNodeBase {
  kind: "call";

  callee: string;

  argumentCount: number;
}

export interface IRRoute extends IRNodeBase {
  kind: "route";

  method: string;

  path: string;

  router: string;

  handler: string | null;

  middleware: string[];
}

export interface IRComponent extends IRNodeBase {
  kind: "component";

  name: string;

  style:
    | "function"
    | "arrow"
    | "function-expression";
}

export interface IRHook extends IRNodeBase {
  kind: "hook";

  name: string;
}

export interface IRMongooseSchema extends IRNodeBase {
  kind: "mongoose-schema";

  name: string;

  fields: Record<string, string>;
}

export interface IRMongooseModel extends IRNodeBase {
  kind: "mongoose-model";

  name: string;

  schema: string | null;

  orm: "mongoose";
}

export interface FileIR {
  path: string;

  language:
    | "javascript"
    | "typescript";

  imports: IRImport[];

  exports: IRExport[];

  functions: IRFunction[];

  classes: IRClass[];

  calls: IRCall[];

  routes: IRRoute[];

  components: IRComponent[];

  hooks: IRHook[];

  mongooseSchemas: IRMongooseSchema[];

  mongooseModels: IRMongooseModel[];

  diagnostics: SourceDiagnostic[];
}

export interface ProjectIR {
  projectId: string;

  generatedAt: string;

  files: FileIR[];

  diagnostics: SourceDiagnostic[];
}