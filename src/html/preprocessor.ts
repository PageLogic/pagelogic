import { DIRECTIVE_TAG_PREFIX, parse, Source } from './parser';
import * as dom from './dom';
import fs from 'fs';
import path from 'path';

export const INCLUDE_DIRECTIVE_TAG = DIRECTIVE_TAG_PREFIX + 'INCLUDE';
export const INCLUDE_SRC_ATTR = 'src';
export const INCLUDE_AS_ATTR = 'as';
export const INCLUDE_ALWAYS_ATTR = 'always';
export const GROUP_DIRECTIVE_TAG = DIRECTIVE_TAG_PREFIX + 'GROUP';

export const MAX_NESTING = 100;

export class Preprocessor {
  docroot: string;

  constructor(docroot: string) {
    this.docroot = docroot;
  }

  async load(fname: string): Promise<Source> {
    const dummy = new Source('', fname);
    const source = await this.loadSource(fname, '.', dummy, 0);
    return source ?? dummy;
  }

  protected async loadSource(
    fname: string, currDir: string, main: Source,
    nesting: number, once = false, from?: dom.Element
  ): Promise<Source | undefined> {
    if (nesting >= MAX_NESTING) {
      main.addError('error', 'Too many nested inclusions', from?.loc);
      return;
    }
    const loaded = await this.loadText(fname, currDir, main, once, from);
    if (!loaded) {
      return;
    }
    const source = parse(loaded.text, loaded.relPath, undefined, (nesting === 0));
    if (source.errors.length) {
      main.errors.push(...source.errors);
      return;
    }
    const dir = path.dirname(loaded.relPath);

    function flattenGroups(p: dom.Element) {
      for (let i = 0; i < p.children.length;) {
        if (p.children[i].type === 'element') {
          const e = p.children[i] as dom.Element;
          if (e.name === GROUP_DIRECTIVE_TAG) {
            p.children.splice(i, 1, ...e.children);
            continue;
          }
          flattenGroups(e);
        }
        i++;
      }
    }
    flattenGroups(source.doc.documentElement!);

    await this.processIncludes(source.doc, dir, main, nesting);
    if (main.errors.length) {
      source.errors.push(...main.errors);
    }
    return source;
  }

  protected async loadText(
    fname: string, currDir: string, main: Source,
    once = false, from?: dom.Element
  ): Promise<{ text: string, relPath: string } | undefined> {
    if (fname.startsWith('/')) {
      currDir = '';
    }
    const pname = path.normalize(path.join(this.docroot, currDir, fname));
    if (!pname.startsWith(this.docroot)) {
      const s = path.relative(this.docroot, pname);
      main.addError('error', `Forbidden pathname "${s}"`, from?.loc);
      return;
    }
    const relPath = pname.substring(this.docroot.length);
    if (main.files.indexOf(relPath) < 0) {
      main.files.push(relPath);
    } else if (once) {
      return;
    }
    let text = '';
    try {
      text = await fs.promises.readFile(pname, { encoding: 'utf8' });
    } catch (error) {
      main.addError('error', `Failed to read "${relPath}"`, from?.loc);
      return;
    }
    return { text, relPath };
  }

  // ===========================================================================
  // inclusion
  // ===========================================================================

  protected async processIncludes(
    doc: dom.Document, currDir: string, main: Source, nesting: number
  ) {
    const includes = new Array<Include>();
    const collectIncludes = (p: dom.Element) => {
      for (const n of p.children) {
        if (n.type === 'element') {
          const e = n as dom.Element;
          if (e.name === INCLUDE_DIRECTIVE_TAG) {
            includes.push({ name: e.name, parent: p, node: e });
          } else {
            collectIncludes(e);
          }
        }
      }
    };
    collectIncludes(doc);
    for (const d of includes) {
      const i = d.parent.children.indexOf(d.node);
      d.parent.children.splice(i, 1);
      await this.processInclude(d, i, currDir, main, nesting);
    }
  }

  protected async processInclude(
    d: Include, i: number,
    currDir: string, main: Source, nesting: number
  ) {
    const src = d.node.getAttribute(INCLUDE_SRC_ATTR);
    if (!src?.trim()) {
      main.addError(
        'error', `Missing ${INCLUDE_SRC_ATTR} attribute`, d.node.loc
      );
      return;
    }
    const as = d.node.getAttribute(INCLUDE_AS_ATTR)?.trim()?.toLocaleLowerCase();
    if (as) {
      if (!/^[\w-]+$/.test(as)) {
        main.addError(
          'error', `Invalid "${INCLUDE_AS_ATTR}" attribute`, d.node.loc
        );
        return;
      }
      return this.processLiteralInclude(d, i, src, as, currDir, main);
    }
    return this.processCodeInclude(d, i, src, currDir, main, nesting);
  }

  protected async processLiteralInclude(
    d: Include, i: number, fname: string, as: string,
    currDir: string, source: Source
  ) {
    const loaded = await this.loadText(fname, currDir, source, false, d.node);
    if (!loaded) {
      return;
    }
    const e = new dom.Element(d.node.doc, as, d.node.loc);
    new dom.Text(e.doc, loaded.text, d.node.loc, false).linkTo(e);
    d.parent.children.splice(i, 0, e);
  }

  protected async processCodeInclude(
    d: Include, i: number, src: string,
    currDir: string, source: Source, nesting: number
  ) {
    const a = d.node.getAttributeNode(INCLUDE_ALWAYS_ATTR);
    const once = !a || a.value === 'false';
    const s = await this.loadSource(
      src, currDir, source, nesting + 1, once, d.node
    );
    const rootElement = s?.doc?.documentElement;
    if (!rootElement) {
      return;
    }
    // apply root attributes
    this.applyIncludedAttributes(d, rootElement);
    // include contents
    const nn = [...rootElement.children];
    if (nn.length > 0) {
      const n = nn[0] as dom.Text;
      if (n.type === 'text' && typeof n.value === 'string' && /^\s*$/.test(n.value)) {
        nn.shift();
      }
    }
    if (nn.length > 0) {
      const n = nn[nn.length - 1] as dom.Text;
      if (n.type === 'text' && typeof n.value === 'string' && /^\s*$/.test(n.value)) {
        nn.pop();
      }
    }
    d.parent.children.splice(i, 0, ...nn);
  }

  protected applyIncludedAttributes(directive: Include, rootElement: dom.Element) {
    const existing = directive.parent.getAttributeNames();
    for (const attr of rootElement.attributes) {
      const name = attr.name;
      if (!existing.has(name)) {
        directive.parent.attributes.push(rootElement.getAttributeNode(name)!);
      }
    }
  }
}

export type Include = {
  name: string,
  node: dom.Element,
  parent: dom.Element,
};
