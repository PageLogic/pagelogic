import { Directive } from '../loader';
import { Plugin } from '../plugin';
import * as html from '../html';
import * as types from '../types';

export const INCLUDE_TAG = ':INCLUDE';
export const IMPORT_TAG = ':IMPORT';
export const INCLUDE_SRC_ATTR = 'src';
export const INCLUDE_AS_ATTR = 'as';

export class IncludesPlugin extends Plugin {

  async handleDirective(d: Directive, i: number): Promise<boolean> {
    if (d.name === INCLUDE_TAG || d.name === IMPORT_TAG) {
      await this.processInclude(d, i);
      return true;
    }
    return false;
  }

  protected async processInclude(d: Directive, i: number) {
    const src = d.node.getAttribute(INCLUDE_SRC_ATTR);
    if (!src?.trim()) {
      d.source.errors.push(new types.Error(
        'error', `missing ${INCLUDE_SRC_ATTR} attribute`, d.node.loc
      ));
      return;
    }
    const as = d.node.getAttribute(INCLUDE_AS_ATTR)?.trim()?.toLocaleLowerCase();
    if (as) {
      if (!/^[\w-]+$/.test(as)) {
        d.source.errors.push(new types.Error(
          'error', `invalid "${INCLUDE_AS_ATTR}" attribute`, d.node.loc
        ));
        return;
      }
      return this.processLiteralInclude(d, i, src, as);
    }
    return this.processCodeInclude(d, i, src);
  }

  protected async processLiteralInclude(d: Directive, i: number, fname: string, as: string) {
    const loaded = await d.loader.loadText(fname, d.currDir, d.source, false, d.node);
    if (!loaded) {
      return;
    }
    const e = new html.Element(d.node.doc, null, as, d.node.loc);
    new html.Text(e.doc, e, loaded.text, d.node.loc, false);
    d.parent.children.splice(i, 0, e);
  }

  protected async processCodeInclude(d: Directive, i: number, src: string) {
    const doc = await d.loader.loadHTML(
      src, d.currDir, d.source, d.nesting + 1, (d.name === IMPORT_TAG), d.node
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

  protected applyIncludedAttributes(directive: Directive, rootElement: html.Element) {
    const existing = directive.parent.getAttributeNames();
    for (const name of rootElement.getAttributeNames()) {
      if (!existing.has(name)) {
        directive.parent.attributes.push(rootElement.getAttributeNode(name)!);
      }
    }
  }
}
