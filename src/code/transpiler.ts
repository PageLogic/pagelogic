import { Expression, Node, ObjectExpression, Program, ReturnStatement } from "acorn";
import { generate } from "escodegen";
import fs from "fs";
import path from "path";
import { GLOBAL_NAME } from "../runtime/web/context";
import { WebScopeProps } from "../runtime/web/scope";
import { WebValueProps } from "../runtime/web/value";
import { CodeLoader } from "./loader";
import { CodeLogic, CodeScope, CodeValue } from "./logic";
import { getMarkup } from "./markup";
import { compileValueRef, qualifyIdentifiers, validateValueRef } from "./reference";
import { CodeError } from "./types";
import { array, fnExpression, literal, object, property } from "./utils";
import { JSXElement, walker } from "./walker";
import { SRC_CLIENT_CODE } from "../consts";

export interface Page {
  fname: string;
  files: string[];
  errors: CodeError[];
  markup?: string;
  code?: string;
  sourceMap?: string;
}

interface CodeTranspilerProps {
  addDocType?: boolean;
  addSourceMap?: boolean;
  clientFile?: string;
}

export class CodeTranspiler {
  loader: CodeLoader;
  props: CodeTranspilerProps;

  constructor(rootPath: string, props?: CodeTranspilerProps) {
    this.loader = new CodeLoader(rootPath);
    this.props = {
      addDocType: true,
      addSourceMap: false,
      clientFile: SRC_CLIENT_CODE,
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
        bodyEndScriptURLs: [ this.props.clientFile!, jsName ],
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
        expression: {
          type: 'CallExpression',
          optional: false,
          callee: {
            type: 'MemberExpression',
            computed: false,
            optional: false,
            object: {
              type: 'MemberExpression',
              computed: false,
              optional: false,
              object: {
                type: 'Identifier',
                name: 'window',
                start: root.node.start, end: root.node.end, loc: root.node.loc
              },
              property: {
                type: 'Identifier',
                name: GLOBAL_NAME,
                start: root.node.start, end: root.node.end, loc: root.node.loc
              },
              start: root.node.start, end: root.node.end, loc: root.node.loc
            },
            property: {
              type: 'Identifier',
              name: 'init',
              start: root.node.start, end: root.node.end, loc: root.node.loc
            },
            start: root.node.start, end: root.node.end, loc: root.node.loc
          },
          arguments: [ast],
          start: root.node.start, end: root.node.end, loc: root.node.loc
        },
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
    const names = Reflect.ownKeys(s.values) as string[];
    if (names.length) {
      const valuesObject = object(s.node);
      for (let name of names) {
        const value = s.values[name]!;
        const valueObject = this.compileValue(name, value, s, page);
        const valueProperty = property(name, valueObject, value.node);
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
  compileValue(name: string, value: CodeValue, scope: CodeScope, page: Page): ObjectExpression {
    const ret = object(value.node);
    const exp = value.node.type === 'Literal'
        ? value.node
        : value.node.expression;
    const fn = fnExpression(exp, value.node);
    const refs = new Set<string>();
    let returnRefs = true;
    ret.properties.push(property('exp', fn, value.node));
    if (fn.body.body.length < 1) {
      return ret;
    }
    qualifyIdentifiers(name, fn.body as any, refs);
    if (fn.body.body[0].type === 'ReturnStatement') {
      const s: ReturnStatement = fn.body.body[0];
      if (
        s.argument?.type === 'ArrowFunctionExpression' ||
        s.argument?.type === 'FunctionExpression'
      ) {
        // function values are not dependent on their references
        // (they shouldn't be refreshed on referenced value changes)
        returnRefs = false;
      }
    }
    if (refs.size) {
      const seenPaths = new Set<string>();
      const aa = array(value.node);
      refs.forEach((ref) => {
        const parts = ref.split('.');
        const res = validateValueRef(page.errors, scope, parts, value);
        if (res === 'ref') {
          const path = parts.join('.');
          if (!seenPaths.has(path)) {
            seenPaths.add(path);
            aa.elements.push(compileValueRef(parts, value) as any);
          }
        }
      });
      returnRefs && ret.properties.push(property('refs', aa, value.node));
    }
    return ret;
  }
}
