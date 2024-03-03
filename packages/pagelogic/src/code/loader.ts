import fs from 'fs';
import path from 'path';
import * as types from './types';
import * as parser from './parser';
import * as html from './html';
import { Config } from './config';

export const MAX_NESTING = 100;
export const TAGS_PREFIX = ':';
export const INCLUDE_TAG = ':INCLUDE';
export const IMPORT_TAG = ':IMPORT';
export const INCLUDE_SRC_ATTR = 'src';
export const INCLUDE_AS_ATTR = 'as';

export type Include = {
  name: string,
  node: html.Element,
  parent: html.Element,
};

/**
 * Loads page source files from a given document root directory,
 * preventing access outside of it.
 * Parses the pages, resolves possible inclusions,
 * and returns a combined Document.
 */
export class Loader {
  config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async load(fname: string): Promise<types.Source> {
    const ret: types.Source = { files: [], errors: [] };
    ret.doc = await this.loadSource(fname, '.', ret, 0);
    if (!ret.errors.length) {
      // processMacros(ret);
    }
    return ret;
  }

  async loadSource(
    fname: string, currDir: string, source: types.Source,
    nesting: number, once = false, from?: html.Element
  ): Promise<html.Document | undefined> {
    if (nesting >= MAX_NESTING) {
      this.addError('error', 'too many nested inclusions', source, from);
      return;
    }
    const loaded = await this.loadText(fname, currDir, source, once, from);
    if (!loaded) {
      return;
    }

    const errors = new Array<types.Error>();
    const doc = parser.parse(loaded.text, loaded.relPath, errors);
    if (errors.length > 0) {
      source.errors.push(...errors);
      return;
    }
    await this.processIncludes(doc, path.dirname(loaded.relPath), source, nesting);
    return doc;
  }

  async loadText(
    fname: string, currDir: string, source: types.Source,
    once = false, from?: html.Element
  ): Promise<{ text: string, relPath: string } | undefined> {
    if (fname.startsWith('/')) {
      currDir = '';
    }
    const pname = path.normalize(path.join(this.config.rootPath, currDir, fname));
    if (!pname.startsWith(this.config.rootPath)) {
      const s = path.relative(this.config.rootPath, pname);
      this.addError('error', `forbidden pathname "${s}"`, source, from);
      return;
    }
    const relPath = pname.substring(this.config.rootPath.length);
    if (source.files.indexOf(relPath) < 0) {
      source.files.push(relPath);
    } else if (once) {
      return;
    }
    let text = '';
    try {
      text = await fs.promises.readFile(pname, { encoding: 'utf8' });
    } catch (error) {
      this.addError('error', `failed to read "${relPath}"`, source, from);
      return;
    }
    return { text, relPath };
  }

  addError(type: types.ErrorType, msg: string, ret: types.Source, from?: html.Node) {
    ret.errors.push(new types.Error(type, msg, from?.loc));
  }

  // ===========================================================================
  // inclusion
  // ===========================================================================

  protected async processIncludes(
    doc: html.Document, currDir: string, source: types.Source, nesting: number
  ) {
    const directives = new Array<Include>();
    const collectIncludes = (p: html.Element) => {
      for (const n of p.children) {
        if (n.type === 'element') {
          const e = n as html.Element;
          if (e.name.startsWith(TAGS_PREFIX)) {
            directives.push({ name: e.name, parent: p, node: e });
          } else {
            collectIncludes(e);
          }
        }
      }
    };
    collectIncludes(doc);
    for (const d of directives) {
      const i = d.parent.children.indexOf(d.node);
      d.parent.children.splice(i, 1);
      await this.processInclude(d, i, currDir, source, nesting);
    }
  }

  protected async processInclude(
    d: Include, i: number,
    currDir: string, source: types.Source, nesting: number
  ) {
    const src = d.node.getAttribute(INCLUDE_SRC_ATTR);
    if (!src?.trim()) {
      source.errors.push(new types.Error(
        'error', `missing ${INCLUDE_SRC_ATTR} attribute`, d.node.loc
      ));
      return;
    }
    const as = d.node.getAttribute(INCLUDE_AS_ATTR)?.trim()?.toLocaleLowerCase();
    if (as) {
      if (!/^[\w-]+$/.test(as)) {
        source.errors.push(new types.Error(
          'error', `invalid "${INCLUDE_AS_ATTR}" attribute`, d.node.loc
        ));
        return;
      }
      return this.processLiteralInclude(d, i, src, as, currDir, source);
    }
    return this.processCodeInclude(d, i, src, currDir, source, nesting);
  }

  protected async processLiteralInclude(
    d: Include, i: number, fname: string, as: string,
    currDir: string, source: types.Source
  ) {
    const loaded = await this.loadText(fname, currDir, source, false, d.node);
    if (!loaded) {
      return;
    }
    const e = new html.Element(d.node.doc, null, as, d.node.loc);
    new html.Text(e.doc, e, loaded.text, d.node.loc, false);
    d.parent.children.splice(i, 0, e);
  }

  protected async processCodeInclude(
    d: Include, i: number, src: string,
    currDir: string, source: types.Source, nesting: number
  ) {
    const doc = await this.loadSource(
      src, currDir, source, nesting + 1, (d.name === IMPORT_TAG), d.node
    );
    const rootElement = doc?.documentElement;
    if (!rootElement) {
      return;
    }
    // apply root attributes
    this.applyIncludedAttributes(d, rootElement);
    // include contents
    const nn = [...rootElement.children];
    if (nn.length > 0) {
      const n = nn[0] as html.Text;
      if (n.type === 'text' && typeof n.value === 'string' && /^\s*$/.test(n.value)) {
        nn.shift();
      }
    }
    if (nn.length > 0) {
      const n = nn[nn.length - 1] as html.Text;
      if (n.type === 'text' && typeof n.value === 'string' && /^\s*$/.test(n.value)) {
        nn.pop();
      }
    }
    d.parent.children.splice(i, 0, ...nn);
  }

  protected applyIncludedAttributes(directive: Include, rootElement: html.Element) {
    const existing = directive.parent.getAttributeNames();
    for (const name of rootElement.getAttributeNames()) {
      if (!existing.has(name)) {
        directive.parent.attributes.push(rootElement.getAttributeNode(name)!);
      }
    }
  }
}
