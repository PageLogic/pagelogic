import fs from 'fs';
import path from 'path';
import * as types from './types';
import * as parser from './parser';
import * as html from './html';
import { Config } from './config';

export const MAX_NESTING = 100;
export const TAGS_PREFIX = ':';
// export const INCLUDE_TAG = ':INCLUDE';
// export const IMPORT_TAG = ':IMPORT';
// export const INCLUDE_SRC_ATTR = 'src';
// export const INCLUDE_AS_ATTR = 'as';

export type Directive = {
  name: string,
  node: html.Element,
  parent: html.Element,
  currDir: string,
  source: types.Source,
  nesting: number,
  loader: Loader,
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
    ret.doc = await this.loadHTML(fname, '.', ret, 0);
    if (!ret.errors.length) {
      // processMacros(ret);
    }
    return ret;
  }

  async loadHTML(
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
    await this.processDirectives(doc, path.dirname(loaded.relPath), source, nesting);
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

  async processDirectives(
    doc: html.Document, currDir: string, source: types.Source, nesting: number
  ) {
    const directives = new Array<Directive>();
    const collectDirectives = (p: html.Element) => {
      for (const n of p.children) {
        if (n.type === 'element') {
          const e = n as html.Element;
          if (e.name.startsWith(TAGS_PREFIX)) {
            directives.push({
              name: e.name, parent: p, node: e,
              currDir, source, nesting,
              loader: this
            });
          } else {
            collectDirectives(e);
          }
        }
      }
    };
    collectDirectives(doc);
    for (const d of directives) {
      const i = d.parent.children.indexOf(d.node);
      d.parent.children.splice(i, 1);
      if (!await this.processDirective(d, i)) {
        this.addError('warning', `unknown directive ${d.name}`, source, d.node);
      }
    }
  }

  async processDirective(d: Directive, i: number): Promise<boolean> {
    for (const p of this.config.plugins) {
      if (await p.handleDirective(d, i)) {
        return true;
      }
    }
    return false;
  }

  addError(type: types.ErrorType, msg: string, ret: types.Source, from?: html.Node) {
    ret.errors.push(new types.Error(type, msg, from?.loc));
  }
}
