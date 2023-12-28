import { ExpressionStatement, Node, Program } from "acorn";
import fs from "fs";
import path from "path";
import { CodeParser } from "./parser";
import { CodeError, CodeErrorType, CodeSource } from "./types";
import { getJSXAttribute } from "./utils";
import { walker, JSXElement, JSXText } from "./walker";

const MAX_NESTING = 100;
const TAGS_PREFIX = ':';
const INCLUDE_TAG = ':include';
const IMPORT_TAG = ':import';
const INCLUDE_SRC_ATTR = 'src';

type Directive = {
  name: string,
  node: JSXElement,
  parent: JSXElement
};

/**
 * Loads page source files from a given document root directory,
 * preventing access outside of it.
 * Parses the pages using CodeParser, resolves possible inclusions,
 * and returns combined ASTs.
 */
export class CodeLoader {
  rootPath: string;
  parser: CodeParser;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.parser = new CodeParser();
  }

  async load(fname: string): Promise<CodeSource> {
    const ret: CodeSource = {
      files: [],
      errors: []
    };
    ret.ast = await this.parse(fname, '.', ret, 0);
    return ret;
  }

  async parse(
    fname: string, currDir: string, source: CodeSource,
    nesting: number, once = false, from?: any
  ): Promise<Program | undefined> {
    let program: Program | undefined;
    if (nesting >= MAX_NESTING) {
      this.addError('error', `too many nested inclusions`, source, from);
      return;
    }
    if (fname.startsWith('/')) {
      currDir = '';
    }
    const pname = path.normalize(path.join(this.rootPath, currDir, fname));
    if (!pname.startsWith(this.rootPath)) {
      const s = path.relative(this.rootPath, pname);
      this.addError('error', `forbidden pathname "${s}"`, source, from);
      return;
    }
    const relPath = pname.substring(this.rootPath.length);
    if (source.files.indexOf(relPath) < 0) {
      source.files.push(relPath);
    } else if (once) {
      return;
    }
    let text = '';
    try {
      text = await fs.promises.readFile(pname, { encoding: 'utf8' });
    } catch (error: any) {
      this.addError('error', `failed to read "${relPath}"`, source, from);
      return;
    }
    try {
      program = this.parser.parse(text, relPath);
    } catch (error: any) {
      this.addError('error', `failed to parse "${relPath}"`, source, from);
      return;
    }
    const body = program.body;
    //TODO: we should remove possible leading JSXText nodes
    if (
      body.length < 1 ||
      body[0].type !== 'ExpressionStatement' ||
      // @ts-ignore
      body[0].expression.type !== 'JSXElement'
    ) {
      this.addError('error', `HTML tag expected "${relPath}"`, source, source.ast);
      return;
    }
    await this.processDirectives(program, path.dirname(relPath), source, nesting);
    return program;
  }

  async processDirectives(
    program: Program, currDir: string, source: CodeSource, nesting: number
  ) {
    const directives = new Array<Directive>();
    // https://github.com/acornjs/acorn/blob/master/acorn-walk/README.md
    walker.ancestor(program, {
      // @ts-ignore
      JSXElement(node, _, ancestors) {
        const parent = (ancestors.length > 1 ? ancestors[ancestors.length - 2] : null);
        if (
          node.type === 'JSXElement' &&
          parent?.type === 'JSXElement' &&
          node.openingElement.name.type === 'JSXIdentifier' &&
          node.openingElement.name.name.startsWith(TAGS_PREFIX)
        ) {
          const name = node.openingElement.name.name;
          directives.push({ name, node, parent });
        }
      }
    });
    for (let d of directives) {
      const i = d.parent.children.indexOf(d.node);
      if (d.name === INCLUDE_TAG || d.name === IMPORT_TAG) {
        i >= 0 && d.parent.children.splice(i, 1);
        await this.processInclude(d, i, currDir, source, nesting);
      } else {
        source.errors.push(new CodeError(
          'warning', `unknown directive ${d.name}`, d.node
        ));
      }
    }
  }

  async processInclude(
    d: Directive, i: number, currDir: string, source: CodeSource, nesting: number,
  ) {
    const src = getJSXAttribute(d.node.openingElement, INCLUDE_SRC_ATTR);
    if (!src?.trim()) {
      source.errors.push(new CodeError(
        'error', `missing ${INCLUDE_SRC_ATTR} attribute`, d.node
      ));
      return;
    }
    const program = await this.parse(
      src, currDir, source, nesting + 1, (d.name === IMPORT_TAG), d.node
    );
    if (!program) {
      return;
    }
    const es = program.body[0] as ExpressionStatement;
    const rootElement = es.expression as unknown as JSXElement;
    // root attributes
    for (let attr of rootElement.openingElement.attributes) {
      //TODO
    }
    // include contents
    const nn = [...rootElement.children];
    if (nn.length > 0) {
      const n = nn[0] as JSXText;
      if (n.type === 'JSXText' && /^\s*$/.test(n.value)) {
        nn.shift();
      }
    }
    if (nn.length > 0) {
      const n = nn[nn.length - 1] as JSXText;
      if (n.type === 'JSXText' && /^\s*$/.test(n.value)) {
        nn.pop();
      }
    }
    d.parent.children.splice(i, 0, ...nn);
  }

  addError(type: CodeErrorType, msg: string, ret: CodeSource, from?: Node) {
    ret.errors.push(new CodeError(type, msg, from));
  }
}
