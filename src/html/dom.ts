import * as acorn from 'acorn';
import { DIRECTIVE_TAG_PREFIX } from './parser';

export const VOID_ELEMENTS = new Set([
  'AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT',
  'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR',
  'COMMAND', 'KEYGEN', 'MENUITEM'
]);

export type NodeType = 'node' | 'text' | 'comment' | 'element' | 'attribute' | 'document';

export interface SourceLocation extends acorn.SourceLocation {
  i1: number;
  i2: number;
}

export abstract class Node {
  doc: Document | null;
  parent: Element | null;
  type: NodeType;
  loc: SourceLocation;

  constructor(
    doc: Document | null,
    type: NodeType,
    loc: SourceLocation
  ) {
    this.doc = doc;
    this.parent = null;
    this.type = type;
    this.loc = loc;
  }

  linkTo(p: Element, ref?: Node): this {
    p.insertBefore(this, ref ?? null);
    return this;
  }

  unlink(): this {
    this.parent?.removeChild(this);
    return this;
  }

  get nextSibling(): Node | null {
    const nn = this.parent?.children;
    const i = nn ? nn.indexOf(this) : -1;
    if (i >= 0 && (i + 1) < (nn ? nn.length : 0)) {
      return nn![i + 1];
    }
    return null;
  }

  toJSON(): object {
    return {
      type: this.type,
      loc: this.doc?.jsonLoc ? this.loc : null
    };
  }

  toString(): string {
    const sb = new Array<string>();
    this.toMarkup(sb);
    return sb.join('');
  }

  abstract toMarkup(ret: string[]): void;
  abstract clone(parent: Element | null): Node;
}

export class Text extends Node {
  value: string | acorn.Expression;
  escaping: boolean;

  constructor (
    doc: Document | null,
    value: string | acorn.Expression,
    loc: SourceLocation,
    escaping = true
  ) {
    super(doc, 'text', loc);
    this.value = typeof value === 'string' && escaping
      ? unescapeText(value)
      : value;
    this.escaping = escaping;
  }

  toJSON(): object {
    return {
      type: this.type,
      value: this.value,
      loc: this.doc?.jsonLoc ? this.loc : null
    };
  }

  toMarkup(ret: string[]): void {
    if (typeof this.value === 'string') {
      ret.push(this.escaping
        ? escape(this.value, '<>')
        : this.value);
    }
  }

  clone(parent: Element | null): Text {
    const ret = new Text(this.doc, this.value, this.loc, this.escaping);
    parent && ret.linkTo(parent);
    return ret;
  }
}

export class Comment extends Node {
  value: string;

  constructor(
    doc: Document | null,
    value: string,
    loc: SourceLocation
  ) {
    super(doc, 'comment', loc);
    this.value = value;
  }

  toJSON(): object {
    return {
      type: this.type,
      value: this.value,
      loc: this.doc?.jsonLoc ? this.loc : null
    };
  }

  toMarkup(ret: string[]): void {
    ret.push('<!--');
    ret.push(this.value);
    ret.push('-->');
  }

  clone(parent: Element | null): Comment {
    const ret = new Comment(this.doc, this.value, this.loc);
    parent && ret.linkTo(parent);
    return ret;
  }
}

export class Attribute extends Node {
  name: string;
  value: string | acorn.Expression;
  valueLoc?: SourceLocation;
  quote?: string;

  constructor(
    doc: Document | null,
    parent: Element | null,
    name: string,
    value: string | acorn.Expression,
    loc: SourceLocation
  ) {
    super(doc, 'attribute', loc);
    this.name = name;
    this.value = value;
    parent && parent.attributes.push(this);
  }

  toJSON(): object {
    return {
      type: this.type,
      name: this.name,
      value: this.value,
      quote: this.quote,
      loc: this.doc?.jsonLoc ? this.loc : null
    };
  }

  toMarkup(ret: string[]): void {
    if (typeof this.value !== 'string') {
      return;
    }
    const q = this.quote ?? '"';
    ret.push(' ');
    ret.push(this.name);
    ret.push('=');
    ret.push(q);
    ret.push(escape(this.value as string, '&<' + q));
    ret.push(q);
  }

  clone(parent: Element | null): Attribute {
    const ret = new Attribute(this.doc, parent, this.name, this.value, this.loc);
    ret.valueLoc = this.valueLoc;
    ret.quote = this.quote;
    return ret;
  }
}

export class Element extends Node {
  name: string;
  children: Node[];
  attributes: Attribute[];

  constructor(
    doc: Document | null,
    name: string,
    loc: SourceLocation
  ) {
    super(doc, 'element', loc);
    this.name = name.toUpperCase();
    this.children = [];
    this.attributes = [];
  }

  appendChild(n: Node): Node {
    return this.insertBefore(n, null);
  }

  insertBefore(n: Node, ref: Node | null): Node {
    this.removeChild(n);
    let i = ref ? this.children.indexOf(ref) : -1;
    i = i < 0 ? this.children.length : i;
    this.children.splice(i, 0, n);
    n.parent = this;
    return n;
  }

  removeChild(n: Node) {
    const i = this.children.indexOf(n);
    i >= 0 && this.children.splice(i, 1);
    n.parent = null;
  }

  getAttributeNames(): Set<string> {
    const ret = new Set<string>();
    this.attributes.forEach(a => ret.add(a.name));
    return ret;
  }

  getAttribute(name: string): string | null {
    let ret: string | null = null;
    for (const a of this.attributes) {
      if (a.name === name) {
        if (typeof a.value === 'string') {
          ret = a.value;
        }
        break;
      }
    }
    return ret;
  }

  getAttributeNode(name: string): Attribute | null {
    for (const a of this.attributes) {
      if (a.name === name) {
        return a;
      }
    }
    return null;
  }

  delAttributeNode(attr: Attribute) {
    const i = this.attributes.indexOf(attr);
    i >= 0 && this.attributes.splice(i, 1);
  }

  setAttribute(name: string, value: string) {
    let a = this.getAttributeNode(name);
    if (a) {
      a.value = value;
      return;
    }
    a = new Attribute(this.doc, this, name, value, this.loc);
  }

  removeAttribute(name: string) {
    const attr = this.getAttributeNode(name);
    attr && this.delAttributeNode(attr);
  }

  toJSON(): object {
    return {
      type: this.type,
      name: this.name,
      attributes: this.attributes,
      children: this.children,
      loc: this.doc?.jsonLoc ? this.loc : null
    };
  }

  toMarkup(ret: string[]): void {
    if (this.name.startsWith(DIRECTIVE_TAG_PREFIX)) {
      return;
    }
    ret.push('<');
    ret.push(this.name.toLowerCase());
    this.attributes.forEach(a => a.toMarkup(ret));
    ret.push('>');
    if (VOID_ELEMENTS.has(this.name)) {
      return;
    }
    this.children.forEach(n => n.toMarkup(ret));
    ret.push('</');
    ret.push(this.name.toLowerCase());
    ret.push('>');
  }

  clone(parent: Element | null): Element {
    const ret = new Element(this.doc, this.name, this.loc);
    parent && ret.linkTo(parent);
    this.attributes.forEach(a => a.clone(ret));
    this.children.forEach(n => n.clone(ret));
    return ret;
  }
}

export class Document extends Element {
  jsonLoc = true;
  domIdElements: Element[] = [];

  constructor(loc: string | SourceLocation) {
    super(null, '#document',
      typeof loc === 'string'
        ? {
          source: loc,
          start: { line: 1, column: 0 },
          end: { line: 1, column: 0 },
          i1: 0,
          i2: 0
        }
        : loc
    );
    this.doc = this;
    this.type = 'document';
  }

  get documentElement(): Element | null {
    for (const e of this.children) {
      if (e.type === 'element') {
        return e as Element;
      }
    }
    return null;
  }

  get head(): Element | null {
    const root = this.documentElement;
    if (root) {
      for (const e of root.children ?? []) {
        if (e.type === 'element' && (e as Element).name === 'HEAD') {
          return e as Element;
        }
      }
    }
    return null;
  }

  get body(): Element | null {
    const root = this.documentElement;
    if (root) {
      for (const e of root.children ?? []) {
        if (e.type === 'element' && (e as Element).name === 'BODY') {
          return e as Element;
        }
      }
    }
    return null;
  }

  toJSON(): object {
    return {
      type: this.type,
      children: this.children,
      loc: this.jsonLoc ? this.loc : null
    };
  }

  toMarkup(ret: string[]): void {
    for (const n of this.children) {
      if (n.type === 'element') {
        n.toMarkup(ret);
        break;
      }
    }
  }
}

function escape(text: string, chars = ''): string {
  let r = text;
  if (chars.indexOf('&') >= 0) r = r.split('&').join('&amp;');
  if (chars.indexOf('<') >= 0) r = r.split('<').join('&lt;');
  if (chars.indexOf('>') >= 0) r = r.split('>').join('&gt;');
  if (chars.indexOf('{') >= 0) r = r.split('{').join('&lbrace;');
  if (chars.indexOf('}') >= 0) r = r.split('}').join('&rbrace;');
  if (chars.indexOf('"') >= 0) r = r.split('"').join('&quot;');
  if (chars.indexOf('\'') >= 0) r = r.split('\'').join('&apos;');
  if (chars.indexOf(' ') >= 0) r = r.split(' ').join('&nbsp;');
  if (chars.indexOf('\n') >= 0) r = r.split('\n').join('&#xA;');
  if (chars.indexOf('\r') >= 0) r = r.split('\r').join('&#xD;');
  return r;
}

export function unescapeText(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, '\'')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
