import * as acorn from 'acorn';

export const VOID_ELEMENTS = new Set([
  'AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT',
  'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR',
  'COMMAND', 'KEYGEN', 'MENUITEM'
]);

export type NodeType = 'node' | 'text' | 'comment' | 'element' | 'attribute' | 'document';

export abstract class Node {
  doc: Document | null;
  parent: Element | null;
  type: NodeType;
  loc: acorn.SourceLocation;

  constructor(
    doc: Document | null,
    parent: Element | null,
    type: NodeType,
    loc: acorn.SourceLocation
  ) {
    this.doc = doc;
    this.parent = null;
    this.type = type;
    this.loc = loc;
    parent && this.linkTo(parent);
  }

  linkTo(parent: Element): void {
    this.parent && this.unlink();
    this.parent = parent;
    parent.children.push(this);
  }

  unlink(): void {
    if (this.parent) {
      const i = this.parent.children.indexOf(this);
      i >= 0 && this.parent.children.splice(i, 1);
      this.parent = null;
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
}

export class Text extends Node {
  value: string | acorn.Expression;
  escaping: boolean;

  constructor (
    doc: Document | null,
    parent: Element | null,
    value: string | acorn.Expression,
    loc: acorn.SourceLocation,
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
}

export class Comment extends Node {
  value: string;

  constructor(
    doc: Document | null,
    parent: Element | null,
    value: string,
    loc: acorn.SourceLocation
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
}

export class Attribute extends Node {
  name: string;
  value: string | acorn.Expression;
  valueLoc?: acorn.SourceLocation;
  quote?: string;

  constructor(
    doc: Document | null,
    parent: Element,
    name: string,
    value: string,
    loc: acorn.SourceLocation
  ) {
    super(doc, null, 'attribute', loc);
    this.parent = parent;
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
}

export class Element extends Node {
  name: string;
  children: Node[];
  attributes: Attribute[];

  constructor(
    doc: Document | null,
    parent: Element | null,
    name: string,
    loc: acorn.SourceLocation
  ) {
    super(doc, parent, 'element', loc);
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
    let ret = null;
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
}

export class Document extends Element {
  jsonLoc = true;

  constructor(loc: string | acorn.SourceLocation) {
    super(null, null, '#document',
      typeof loc === 'string'
        ? { source: loc, start: { line: 1, column: 0 }, end: { line: 1, column: 0 }}
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
