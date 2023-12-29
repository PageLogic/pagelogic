import { ObjectExpression, Program } from "acorn";
import { generate } from "escodegen";
import { WebScopeProps } from "../runtime/web/scope";
import { WebValueProps } from "../runtime/web/value";
import { CodeLoader } from "./loader";
import { CodeLogic, CodeScope, CodeValue } from "./logic";
import { getMarkup } from "./markup";
import { compileValueRef, qualifyIdentifiers, validateValueRef } from "./reference";
import { CodeError } from "./types";
import { array, fnExpression, literal, object, property } from "./utils";

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
    const ast = this.compileScope(root, ret);
    return {
      type: 'Program',
      body: [{
        type: 'ExpressionStatement',
        expression: ast,
        start: root.node.start, end: root.node.end, loc: root.node.loc
      }],
      sourceType: 'script',
      start: root.node.start, end: root.node.end, loc: root.node.loc
    }
  }

  /**
   * @see WebScopeProps
   */
  compileScope(s: CodeScope, page: Page): ObjectExpression {
    const ret = object(s.node);
    ret.properties.push(property('id', literal(s.id, s.node), s.node));
    if (s.name) {
      ret.properties.push(property('name', literal(s.name, s.node), s.node));
    }
    // values
    if (s.values.length) {
      const valuesObject = object(s.node);
      for (let value of s.values) {
        const valueObject = this.compileValue(value, s, page);
        const valueProperty = property(value.name, valueObject, value.node);
        valuesObject.properties.push(valueProperty);
      }
      ret.properties.push(property('values', valuesObject, s.node));
    }
    // children
    if (s.children.length) {
      const children = array(s.node);
      s.children.forEach(child => {
        children.elements.push(this.compileScope(child, page));
      });
      ret.properties.push(property('children', children, s.node));
    }
    return ret;
  }

  /**
   * @see WebValueProps
   */
  compileValue(value: CodeValue, scope: CodeScope, page: Page): ObjectExpression {
    const ret = object(value.node);
    const exp = value.node.type === 'Literal'
        ? value.node
        : value.node.expression;
    const fn = fnExpression(exp, value.node);
    const refs = new Set<string>();
    qualifyIdentifiers(value.name, fn.body as any, refs);
    ret.properties.push(property('exp', fn, value.node));
    if (refs.size) {
      const seenPaths = new Set<string>();
      const aa = array(value.node);
      ret.properties.push(property('refs', aa, value.node));
      for (let ref of refs) {
        const parts = ref.split('.');
        if (validateValueRef(page.errors, scope, parts, value)) {
          const path = parts.join('.');
          if (!seenPaths.has(path)) {
            seenPaths.add(path);
            aa.elements.push(compileValueRef(parts, value) as any);
          }
        }
      }
    }
    return ret;
  }
}
