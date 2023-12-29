import { Node, ObjectExpression, Program } from "acorn";
import { generate } from "escodegen";
import fs from "fs";
import path from "path";
import { WebScopeProps } from "../runtime/web/scope";
import { WebValueProps } from "../runtime/web/value";
import { CodeLoader } from "./loader";
import { CodeLogic, CodeScope, CodeValue } from "./logic";
import { getMarkup } from "./markup";
import { compileValueRef, qualifyIdentifiers, validateValueRef } from "./reference";
import { CodeError } from "./types";
import { array, fnExpression, literal, object, property } from "./utils";
import { JSXElement, walker } from "./walker";

export interface Page {
  fname: string;
  files: string[];
  errors: CodeError[];
  markup?: string;
  code?: string;
  sourceMap?: string;
}

interface CodeCompilerProps {
  addDocType?: boolean;
  addSourceMap?: boolean;
}

export class CodeCompiler {
  loader: CodeLoader;
  props: CodeCompilerProps;

  constructor(rootPath: string, props?: CodeCompilerProps) {
    this.loader = new CodeLoader(rootPath);
    this.props = {
      addDocType: true,
      addSourceMap: false,
      ...(props || {})
    }
  }

  async list(suffix: string, depth = 0): Promise<string[]> {
    const ret: string[] = [];
    const root = this.loader.rootPath;
    const fn = async (dir: string, level: number) => {
      if (depth > 0 && level >= depth) {
        return;
      }
      const ff = await fs.promises.readdir(path.join(root, dir));
      for (let f of ff) {
        if (f.startsWith('.')) {
          continue;
        }
        if (f.endsWith(suffix)) {
          ret.push(path.join(dir, f));
        }
      }
      for (let f of ff) {
        if (f.startsWith('.')) {
          continue;
        }
        const stat = await fs.promises.stat(path.join(root, dir, f));
        if (stat.isDirectory()) {
          await fn(path.join(dir, f), level + 1);
        }
      }
    }
    await fn('.', 0);
    return ret;
  }

  async compile(fname: string): Promise<Page> {
    const ret: Page = { fname, files: [], errors: [] };
    const source = await this.loader.load(fname);
    ret.files.splice(0, 0, ...source.files);
    if (source.errors.length > 0) {
      ret.errors.splice(0, 0, ...source.errors);
      return ret;
    }
    this.cleanupPage(source.ast!);
    const logic = new CodeLogic(source);
    if (logic.errors.length > 0) {
      ret.errors.splice(0, 0, ...logic.errors);
      return ret;
    }
    const program = this.compilePage(logic, ret);
    if (!ret.errors.length) {
      const name = path.basename(fname);
      const suffix = path.extname(name);
      const length = name.length - suffix.length;
      const jsName = name.substring(0, length) + '.js';
      ret.markup = getMarkup(source.ast!, {
        addDocType: this.props.addDocType,
        bodyEndScriptURLs: [ jsName ],
      });
      const format = {
        indent: {
          style: '  '
        }
      };
      ret.code = generate(program, { format });
      if (this.props.addSourceMap) {
        ret.sourceMap = generate(program, { sourceMap: fname, format });
      }
    }
    return ret;
  }

  cleanupPage(ast: Program) {
    const toRemove = new Array<{n: Node, p: JSXElement}>();
    walker.ancestor(ast, {
      // @ts-ignore
      JSXEmptyExpression(node, _, ancestors) {
        if (ancestors.length > 2) {
          const p1 = ancestors[ancestors.length - 2];
          const p2 = ancestors[ancestors.length - 3];
          if (p1.type === 'JSXExpressionContainer' && p2.type === 'JSXElement') {
            toRemove.push({ n: p1, p: p2 });
          }
        }
      }
    });
    for (let r of toRemove) {
      const i = r.p.children.indexOf(r.n);
      r.p.children.splice(i, 1);
    }
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
