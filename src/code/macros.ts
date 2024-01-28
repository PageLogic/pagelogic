import { Node } from "acorn";
import { CodeError, CodeSource } from "./types";
import { getJSXAttribute, getJSXAttributeKeys, getJSXAttributeNode, removeJSXAttribute } from "./utils";
import { JSXElement, walker } from "./walker";

export const MAX_NESTING = 100;
export const DEFINE_TAG = ':define';
export const DEFINE_TAG_ATTR = 'tag';
export const SLOT_TAG = ':slot';
export const SLOT_NAME_ATTR = 'name';
export const SLOT_DEFAULT_NAME = 'default';
export const SLOT_ATTR = ':slot';
export const DEFAULT_SLOT_NAME = 'default';

interface MacrosSource {
  codeSource: CodeSource;
  macros: MacroDefinitions;
}

export type MacroDefinitions = { [key: string]: MacroDefinition };

export type MacroDefinition = {
  name: string;
  node: JSXElement;
  parent: JSXElement;
  base: string;
  from?: MacroDefinition;
  // slots: { [key: string]: SlotDefinition };
}

export type SlotDefinition = {
  name: string;
  element: JSXElement;
  parent: JSXElement;
}

export function processMacros(codeSource: CodeSource): MacroDefinitions {
  const source: MacrosSource = { codeSource, macros: {} };
  collectMacros(source.codeSource.ast!,source, 0);
  expandMacros(source.codeSource.ast!, source, 0);
  return source.macros;
}

// =============================================================================
// collect
// =============================================================================

function collectMacros(root: Node, source: MacrosSource, nesting: number) {
  // collect macro definitions
  walker.ancestor(root, {
    // @ts-ignore
    JSXOpeningElement(opening, _, ancestors) {
      const parent = ancestors.length > 2
          ? ancestors[ancestors.length - 3]
          : null;
      const element = ancestors.length > 1
          ? ancestors[ancestors.length - 2]
          : null;
      if (element === root) {
        return;
      }
      if (parent?.type !== 'JSXElement' ||
          opening.name.type !== 'JSXIdentifier' ||
          opening.name.name !== DEFINE_TAG) {
        return;
      }
      const macro = collectMacro(element, parent, source, nesting);
      if (macro) {
        source.macros[macro.name] = macro;
      }
    }
  });
  // remove definitions from DOM
  for (const key of Reflect.ownKeys(source.macros) as string[]) {
    const macro = source.macros[key]!;
    const i = macro.parent.children.indexOf(macro.node);
    i >= 0 && macro.parent.children.splice(i, 1);
  }
}

function collectMacro(
  node: JSXElement, parent: JSXElement, source: MacrosSource,
  nesting: number
): MacroDefinition | null {
  const tag = getJSXAttribute(node.openingElement, DEFINE_TAG_ATTR);
  if (!tag) {
    source.codeSource.errors.push(new CodeError(
      'warning', `bad or missing "${DEFINE_TAG_ATTR}" attribute`, node
    ));
    return null;
  }
  removeJSXAttribute(node.openingElement, DEFINE_TAG_ATTR);
  const res = /^([\-\w]+)(\:[\-\w]+)?$/.exec(tag);
  if (!res) {
    source.codeSource.errors.push(new CodeError(
      'warning',
      `invalid tag name "${tag} (does it include a dash?)"`,
      node
    ));
    return null;
  }
  const name = res[1];
  const base = (res.length > 1 && res[2] ? res[2].substring(1) : 'div');
  const from = base.indexOf('-') >= 0 ? source.macros[base] : undefined;
  expandMacros(node, source, nesting + 1);
  return { name, node, parent, base, from };
}

function collectSlots(
  node: JSXElement, source: MacrosSource
): Map<string, SlotDefinition> {
  const ret = new Map<string, SlotDefinition>();
  walker.ancestor(node, {
    // @ts-ignore
    JSXOpeningElement(opening, _, ancestors) {
      const parent = ancestors.length > 2
          ? ancestors[ancestors.length - 3]
          : null;
      const element = ancestors.length > 1
          ? ancestors[ancestors.length - 2]
          : null;
      if (parent?.type !== 'JSXElement' ||
          opening.name.type !== 'JSXIdentifier' ||
          opening.name.name !== SLOT_TAG) {
        return;
      }
      const name = getJSXAttribute(element.openingElement, SLOT_NAME_ATTR);
      if (!name) {
        source.codeSource.errors.push(new CodeError(
          'warning', `bad or missing "${SLOT_NAME_ATTR}" attribute`, element
        ));
        return;
      }
      if (!/^[\-\w]+?$/.test(name)) {
        source.codeSource.errors.push(new CodeError(
          'warning', `bad slot name`, element
        ));
        return;
      }
      ret.set(name, { name, element, parent });
    }
  });
  return ret;
}

// =============================================================================
// expand
// =============================================================================

function expandMacros(root: Node, source: MacrosSource, nesting: number) {
  const subs = new Array<{
    parent: JSXElement, replacer: JSXElement, replaced: JSXElement
  }>();
  walker.ancestor(root, {
    // @ts-ignore
    JSXOpeningElement(opening, _, ancestors) {
      const parent = ancestors.length > 2
          ? ancestors[ancestors.length - 3]
          : null;
      const element = ancestors.length > 1
          ? ancestors[ancestors.length - 2]
          : null;
      if (element === root) {
        return;
      }
      if (parent?.type !== 'JSXElement' ||
          opening.name.type !== 'JSXIdentifier') {
        return;
      }
      const macro = source.macros[opening.name.name];
      if (!macro) {
        return;
      }
      const e = expandMacro(element, macro, source, nesting);
      if (e) {
        subs.push({
          parent,
          replacer: e,
          replaced: element
        });
      }
    }
  });
  subs.forEach(sub => {
    const p = sub.parent.children;
    const i = p.indexOf(sub.replaced);
    p.splice(i, 1, sub.replacer);
  });
}

function expandMacro(
  use: JSXElement, def: MacroDefinition,
  source: MacrosSource, nesting: number
): JSXElement | null {
  if (nesting >= MAX_NESTING) {
    source.codeSource.errors.push(new CodeError(
      'error', `too many nested macros "${def.name}"`, use
    ));
    return null;
  }
  let ret: JSXElement | null = null;
  if (def.from) {
    const e = JSON.parse(JSON.stringify(def.node));
    ret = expandMacro(e, def.from, source, nesting + 1);
  } else {
    ret = JSON.parse(JSON.stringify(def.node));
    ret!.openingElement.name.name = def.base;
    if (ret?.closingElement) {
      ret.closingElement.name.name = def.base;
    }
  }
  ret && populateMacro(use, ret, source, nesting);
  return ret;
}

function populateMacro(
  src: JSXElement, dst: JSXElement,
  source: MacrosSource, nesting: number
) {
  getJSXAttributeKeys(src.openingElement).forEach(key => {
    const srcAttr = getJSXAttributeNode(src.openingElement, key)!;
    removeJSXAttribute(dst.openingElement, key);
    dst.openingElement.attributes.push(srcAttr);
  });
  const slots = collectSlots(dst, source);
  src.children.slice().forEach(n => {
    let slotName = DEFAULT_SLOT_NAME;
    if (n.type === 'JSXElement') {
      const s = getJSXAttribute((n as JSXElement).openingElement, SLOT_ATTR);
      s && (slotName = s);
      removeJSXAttribute((n as JSXElement).openingElement, SLOT_ATTR);
    }
    if (slotName === DEFAULT_SLOT_NAME && !slots.has(slotName)) {
      if (dst.openingElement.selfClosing) {
        dst.openingElement.selfClosing = false;
        dst.closingElement = {
          type: 'JSXClosingElement',
          name: dst.openingElement.name,
          start: dst.openingElement.start,
          end: dst.openingElement.end
        }
      }
      dst.children.push(n);
      return;
    }
    const slot = slots.get(slotName);
    if (!slot) {
      source.codeSource.errors.push(new CodeError(
        'error', `unknown slot "${slotName}"`, n
      ));
      return;
    }
    const i = slot.parent.children.indexOf(slot.element);
    slot.parent.children.splice(i, 0, n);
  });
  slots.forEach(slot => {
    const i = slot.parent.children.indexOf(slot.element);
    slot.parent.children.splice(i, 1);
  });
  expandMacros(dst, source, nesting + 1);
}
