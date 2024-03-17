import { Plugin } from '../plugin';
import * as types from '../types';
import * as html from '../parser/html';
import { DIRECTIVE_PREFIX } from '../parser/loader';

export const MAX_NESTING = 100;
export const DEFINE_TAG = DIRECTIVE_PREFIX + 'DEFINE';
export const DEFINE_TAG_ATTR = 'tag';
export const SLOT_TAG = DIRECTIVE_PREFIX + 'SLOT';
export const SLOT_NAME_ATTR = 'name';
export const SLOT_ATTR = ':slot';
export const DEFAULT_SLOT_NAME = 'default';

type Definitions = {
  [key: string]: Definition
};

type Definition = {
  name: string;
  node: html.Element;
  parent: html.Element;
  base: string;
  from?: Definition;
}

export type SlotDefinition = {
  name: string;
  element: html.Element;
  parent: html.Element;
}

export class Macros extends Plugin {

  async didLoad(source: types.Source) {
    const macros: Definitions = {};
    this.collectMacros(source, source.doc!, 0, macros);
    this.removeMacros(source, macros);
    this.expandMacros(source, source.doc!, 0, macros);
  }

  // ===========================================================================
  // collection
  // ===========================================================================

  protected collectMacros(
    source: types.Source, p: html.Element, nesting: number, ret: Definitions
  ): Definitions {
    const f = (p: html.Element) => {
      for (const e of p.children as html.Element[]) {
        if (e.type !== 'element') {
          continue;
        }
        if (e.name !== DEFINE_TAG) {
          f(e);
          continue;
        }
        const macro = this.collectMacro(source, p, e, nesting, ret);
        if (macro) {
          ret[macro.name.toUpperCase()] = macro;
        }
      }
    };
    f(p);
    return ret;
  }

  protected collectMacro(
    source: types.Source, p: html.Element, e: html.Element, nesting: number,
    macros: Definitions
  ): Definition | null {
    const tagAttr = e.getAttributeNode(DEFINE_TAG_ATTR);
    if (!tagAttr || typeof tagAttr.value !== 'string') {
      source.addError('warning', `bad or missing "${DEFINE_TAG_ATTR}" attribute`, e.loc);
      return null;
    }
    const i = e.attributes.indexOf(tagAttr);
    e.attributes.splice(i, 1);
    const tag = tagAttr.value;
    const res = /^([\w-]+)(:[\w-]+)?$/.exec(tag);
    if (!res) {
      source.addError('warning', `invalid tag name "${tag} (does it include a dash?)"`, e.loc);
      return null;
    }
    const name = res[1];
    const base = (res.length > 1 && res[2] ? res[2].substring(1) : 'div');
    const from = base.indexOf('-') >= 0 ? macros[base.toUpperCase()] : undefined;
    this.expandMacros(source, e, nesting + 1, macros);
    return { name, node: e, parent: p, base, from };
  }

  protected removeMacros(source: types.Source, macros: Definitions) {
    for (const name of Reflect.ownKeys(macros) as string[]) {
      const macro = macros[name];
      const i = macro.parent.children.indexOf(macro.node);
      macro.parent.children.splice(i, 1);
    }
  }

  protected collectSlots(
    node: html.Element, source: types.Source
  ): Map<string, SlotDefinition> {
    const ret = new Map<string, SlotDefinition>();
    const f = (p: html.Element) => {
      p.children.forEach(n => {
        if (n.type !== 'element') {
          return;
        }
        const e = n as html.Element;
        if (e.name !== SLOT_TAG) {
          f(e);
          return;
        }
        const name = e.getAttribute(SLOT_NAME_ATTR);
        if (!name || !/^[\w-]+?$/.test(name)) {
          source.addError('warning', 'bad slot name', e.loc);
          return;
        }
        ret.set(name, { name, element: e, parent: p });
      });
    };
    f(node);
    return ret;
  }

  // ===========================================================================
  // expansion
  // ===========================================================================

  protected expandMacros(
    source: types.Source, p: html.Element, nesting: number, macros: Definitions
  ) {
    const subs = new Array<{
      parent: html.Element,
      replacer: html.Element,
      replaced: html.Element
    }>();
    const f = (p: html.Element) => {
      for (const e of p.children as html.Element[]) {
        if (e.type !== 'element') {
          continue;
        }
        const macro = macros[e.name];
        if (!macro) {
          f(e);
          continue;
        }
        const r = this.expandMacro(source, p, e, macro, nesting, macros);
        r && subs.push({ parent: p, replacer: r, replaced: e });
      }
    };
    f(p);
    subs.forEach(sub => {
      const p = sub.parent.children;
      const i = p.indexOf(sub.replaced);
      p.splice(i, 1, sub.replacer);
    });
  }

  protected expandMacro(
    source: types.Source, p: html.Element, e: html.Element, def: Definition,
    nesting: number, macros: Definitions
  ): html.Element | null {
    if (nesting > MAX_NESTING) {
      source.addError('error', `too many nested macros "${def.name}"`, e.loc);
      return null;
    }
    let ret: html.Element | null = null;
    if (def.from) {
      const f = def.node.clone(null);
      ret = this.expandMacro(source, p, f, def.from, nesting + 1, macros);
    } else {
      ret = def.node.clone(null);
      ret.name = def.base;
    }
    ret && this.populateMacro(e, ret, source, nesting, macros);
    return ret;
  }

  protected populateMacro(
    src: html.Element, dst: html.Element,
    source: types.Source, nesting: number,
    macros: Definitions
  ) {
    src.attributes.forEach(srcAttr => {
      const dstAttr = dst.getAttributeNode(srcAttr.name);
      dstAttr && dst.delAttributeNode(dstAttr);
      dst.attributes.push(srcAttr);
    });
    const slots = this.collectSlots(dst, source);
    src.children.slice().forEach(n => {
      let slotName = DEFAULT_SLOT_NAME;
      if (n.type === 'element') {
        const e = n as html.Element;
        const a = e.getAttributeNode(SLOT_ATTR);
        if (a && typeof a.value === 'string' && a.value.trim()) {
          if (typeof a.value === 'string' && a.value.trim()) {
            slotName = a.value;
          }
          e.delAttributeNode(a);
        }
      }
      if (slotName === DEFAULT_SLOT_NAME && !slots.has(slotName)) {
        dst.children.push(n);
        return;
      }
      const slot = slots.get(slotName);
      if (!slot) {
        source.addError('error', `unknown slot "${slotName}"`, n.loc);
        return;
      }
      const i = slot.parent.children.indexOf(slot.element);
      slot.parent.children.splice(i, 0, n);
    });
    slots.forEach(slot => {
      const i = slot.parent.children.indexOf(slot.element);
      slot.parent.children.splice(i, 1);
    });
    this.expandMacros(source, dst, nesting + 1, macros);
  }
}
