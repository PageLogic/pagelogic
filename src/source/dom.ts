import * as acorn from 'acorn';
import { DIRECTIVE_TAG_PREFIX } from './preprocessor';

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
  type: NodeType;
  loc: SourceLocation;

  constructor(
    doc: Document | null,
    parent: Element | null,
    type: NodeType,
    loc: SourceLocation,
    ref?: Node
  ) {
    this.doc = doc;
    this.type = type;
    this.loc = loc;
    if (parent) {
      ref
        ? parent.children.splice(parent.children.indexOf(ref), 0, this)
        : parent.children.push(this);
    }
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
    parent: Element | null,
    value: string | acorn.Expression,
    loc: SourceLocation,
    escaping = true
  ) {
    super(doc, parent, 'text', loc);
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
        ? escape(this.value as string, '<>')
        : this.value as string);
    }
  }

  clone(parent: Element | null): Text {
    return new Text(this.doc, parent, this.value, this.loc, this.escaping);
  }
}

export class Comment extends Node {
  value: string;

  constructor(
    doc: Document | null,
    parent: Element | null,
    value: string,
    loc: SourceLocation
  ) {
    super(doc, parent, 'comment', loc);
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
    return new Comment(this.doc, parent, this.value, this.loc);
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
    super(doc, null, 'attribute', loc);
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
    parent: Element | null,
    name: string,
    loc: SourceLocation,
    ref?: Node
  ) {
    super(doc, parent, 'element', loc, ref);
    this.name = name.toUpperCase();
    this.children = [];
    this.attributes = [];
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
    const ret = new Element(this.doc, parent, this.name, this.loc);
    this.attributes.forEach(a => a.clone(ret));
    this.children.forEach(n => n.clone(ret));
    return ret;
  }
}

export class Document extends Element {
  jsonLoc = true;

  constructor(loc: string | SourceLocation) {
    super(null, null, '#document',
      typeof loc === 'string'
        ? { source: loc, start: { line: 1, column: 0 }, end: { line: 1, column: 0 }, i1: 0, i2: 0 }
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
