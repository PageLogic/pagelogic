import { ExpressionStatement, Node, Program } from "acorn";
import fs from "fs";
import path from "path";
import { DEFINE_TAG, SLOT_TAG, processMacros } from "./macros";
import { CodeParser } from "./parser1";
import { CodeError, CodeErrorType, CodeSource } from "./types";
import { getJSXAttribute, getJSXAttributeKeys, getJSXAttributeNode, position } from "./utils";
import { JSXElement, JSXIdentifier, JSXText, walker } from "./walker";
import { parseSource } from "./src-parser";

export const MAX_NESTING = 100;
export const TAGS_PREFIX = ':';
export const INCLUDE_TAG = ':include';
export const IMPORT_TAG = ':import';
export const INCLUDE_SRC_ATTR = 'src';
export const INCLUDE_AS_ATTR = 'as';

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
  // parser: CodeParser;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    // this.parser = new CodeParser();
  }

  async load(fname: string): Promise<CodeSource> {
    const ret: CodeSource = { files: [], errors: [] };
    ret.ast = await this.parse(fname, '.', ret, 0);
    if (!ret.errors.length) {
      processMacros(ret);
    }
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
    const loaded = await this.loadText(fname, currDir, source, once, from);
    if (!loaded) {
      return;
    }

    // try {
    //   program = this.parser.parse(loaded.text, loaded.relPath);
    // } catch (error: any) {
    //   this.addError('error', `${error} in "${loaded.relPath}"`, source, from);
    //   return;
    // }
    const src = parseSource(loaded.text, loaded.relPath);
    if (src.errors.length > 0) {
      source.errors.push(...src.errors);
      return;
    }
    program = src.program;

    const body = program.body;
    //TODO: we should remove possible leading JSXText nodes
    if (
      body.length < 1 ||
      body[0].type !== 'ExpressionStatement' ||
      // @ts-ignore
      body[0].expression.type !== 'JSXElement'
    ) {
      this.addError('error', `HTML tag expected "${loaded.relPath}"`, source, source.ast);
      return;
    }
    await this.processDirectives(program, path.dirname(loaded.relPath), source, nesting);
    return program;
  }

  async loadText(
    fname: string, currDir: string, source: CodeSource,
    once = false, from?: any
  ): Promise<{ text: string, relPath: string } | undefined> {
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
    return { text, relPath };
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
      } else if (d.name === DEFINE_TAG || d.name === SLOT_TAG) {
        // nop
      } else {
        i >= 0 && d.parent.children.splice(i, 1);
        source.errors.push(new CodeError(
          'warning', `unknown directive ${d.name}`, d.node.loc
        ));
      }
    }
  }

  // ===========================================================================
  // inclusions
  // ===========================================================================

  async processInclude(
    d: Directive, i: number, currDir: string, source: CodeSource, nesting: number,
  ) {
    const src = getJSXAttribute(d.node.openingElement, INCLUDE_SRC_ATTR);
    if (!src?.trim()) {
      source.errors.push(new CodeError(
        'error', `missing ${INCLUDE_SRC_ATTR} attribute`, d.node.loc
      ));
      return;
    }
    const asAttr = getJSXAttributeNode(d.node.openingElement, INCLUDE_AS_ATTR);
    if (asAttr) {
      const as = getJSXAttribute(d.node.openingElement, INCLUDE_AS_ATTR)
        ?.trim().toLocaleLowerCase();
      if (!as || !/^[\w\-]+$/.test(as)) {
        source.errors.push(new CodeError(
          'error', `invalid "${INCLUDE_AS_ATTR}" attribute`, d.node.loc
        ));
        return;
      }
      return this.processLiteralInclude(d, src, as, i, currDir, source, nesting);
    }
    return this.processCodeInclude(d, src, i, currDir, source, nesting);
  }

  async processLiteralInclude(
    d: Directive, fname: string, as: string, i: number, currDir: string,
    source: CodeSource, nesting: number
  ) {
    const loaded = await this.loadText(fname, currDir, source, false, d.node);
    if (!loaded) {
      return;
    }
    const text: JSXText = {
      type: 'JSXText',
      value: loaded.text,
      start: 0,
      end: loaded.text.length,
    };
    const name: JSXIdentifier = {
      type: 'JSXIdentifier',
      name: as,
      ...position(d.node.openingElement.name),
    };
    const e: JSXElement = {
      type: 'JSXElement',
      ...position(d.node),
      openingElement: {
        type: 'JSXOpeningElement',
        name: name,
        attributes: [],
        selfClosing: false,
        ...position(d.node.openingElement),
      },
      closingElement: {
        type: 'JSXClosingElement',
        name: name,
        ...position(d.node.openingElement),
      },
      children: [ text ]
    };
    d.parent.children.splice(i, 0, e);
  }

  async processCodeInclude(
    d: Directive, src: string, i: number, currDir: string,
    source: CodeSource, nesting: number
  ) {
    const program = await this.parse(
      src, currDir, source, nesting + 1, (d.name === IMPORT_TAG), d.node
    );
    if (!program) {
      return;
    }
    const es = program.body[0] as ExpressionStatement;
    const rootElement = es.expression as unknown as JSXElement;
    // apply root attributes
    this.applyIncludedAttributes(d, rootElement);
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
    ret.errors.push(new CodeError(type, msg, from?.loc));
  }

  applyIncludedAttributes(directive: Directive, rootElement: JSXElement) {
    const p = directive.parent.openingElement;
    const r = rootElement.openingElement;
    const existing = getJSXAttributeKeys(p);
    const included = getJSXAttributeKeys(r)
    for (let key of included) {
      if (!existing.includes(key)) {
        const attr = getJSXAttributeNode(r, key);
        p.attributes.push(attr!);
      }
    }
  }
}
