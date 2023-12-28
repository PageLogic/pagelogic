import { ArrayExpression, Expression, Identifier, Node, ObjectExpression, Program, Property } from "acorn";
import { CodeLoader } from "./loader";
import { CodeLogic, CodeScope } from "./logic";
import { CodeError } from "./types";
import { getMarkup } from "./markup";
import { generate } from "escodegen";

export interface Page {
  fname: string;
  files: string[];
  errors: CodeError[];
  markup?: string;
  code?: string;
}

export class CodeCompiler {
  loader: CodeLoader;

  constructor(rootPath: string) {
    this.loader = new CodeLoader(rootPath);
  }

  async compile(fname: string): Promise<Page> {
    const ret: Page = { fname, files: [], errors: [] };
    const source = await this.loader.load(fname);
    if (source.errors.length > 0) {
      ret.errors.splice(0, 0, ...source.errors);
      return ret;
    }
    const logic = new CodeLogic(source);
    if (logic.errors.length > 0) {
      ret.errors.splice(0, 0, ...logic.errors);
      return ret;
    }
    const program = this.compilePage(logic, ret);
    if (!ret.errors.length) {
      ret.markup = getMarkup(source.ast!);
      ret.code = generate(program);
    }
    return ret;
  }

  compilePage(logic: CodeLogic, ret: Page): Program {
    const root = logic.root!;
    return {
      type: 'Program',
      body: [{
        type: 'ExpressionStatement',
        expression: this.compileScope(root),
        start: root.node.start,
        end: root.node.end,
        loc: root.node.loc
      }],
      sourceType: 'script',
      start: root.node.start,
      end: root.node.end,
      loc: root.node.loc
    }
  }

  compileScope(scope: CodeScope): ObjectExpression {
    const ret = object(scope.node);
    if (scope.children.length) {
      const children = array(scope.node);
      scope.children.forEach(child => {
        children.elements.push(this.compileScope(child));
      });
      ret.properties.push(property('children', children, scope.node));
    }
    return ret;
  }
}

function object(ref: Node): ObjectExpression {
  return {
    type: 'ObjectExpression',
    properties: [],
    start: ref.start, end: ref.end, loc: ref.loc
  }
}

function property(key: string, val: Expression, ref: Node): Property {
  return {
    type: 'Property',
    method: false,
    shorthand: false,
    computed: false,
    key: identifier(key, ref),
    value: val,
    kind: 'init',
    start: ref.start, end: ref.end, loc: ref.loc
  }
}

function identifier(key: string, ref: Node): Identifier {
  return {
    type: 'Identifier',
    name: key,
    start: ref.start, end: ref.end, loc: ref.loc
  }
}

function array(ref: Node): ArrayExpression {
  return {
    type: 'ArrayExpression',
    elements: [],
    start: ref.start, end: ref.end, loc: ref.loc
  }
}
