import * as acorn from 'acorn';
import { Attribute, Element, Node, Text, Document, NodeType } from './dom';
import { DIRECTIVE_TAG_PREFIX } from './parser';

export const VOID_ELEMENTS = new Set([
  'AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT',
  'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR',
  'COMMAND', 'KEYGEN', 'MENUITEM'
]);

export interface SourceLocation extends acorn.SourceLocation {
  i1: number;
  i2: number;
}

export abstract class ServerNode implements Node {
  doc: ServerDocument | null;
  parent: ServerElement | null;
  nodeType: number;
  loc: SourceLocation;

  constructor(
    doc: ServerDocument | null,
    type: number,
    loc: SourceLocation
  ) {
    this.doc = doc;
    this.parent = null;
    this.nodeType = type;
    this.loc = loc;
  }

  // protected linkTo(p: ServerElement, ref?: ServerNode): this {
  //   p.insertBefore(this, ref ?? null);
  //   return this;
  // }

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
      type: this.nodeType,
      loc: this.doc?.jsonLoc ? this.loc : null
    };
  }

  toString(): string {
    const sb = new Array<string>();
    this.toMarkup(sb);
    return sb.join('');
  }

  abstract toMarkup(ret: string[]): void;
  abstract clone(parent: ServerElement | null): ServerNode;
}

export class ServerText extends ServerNode implements Text {
  value: string | acorn.Expression;
  escaping: boolean;

  constructor (
    doc: ServerDocument | null,
    value: string | acorn.Expression,
    loc: SourceLocation,
    escaping = true
  ) {
    super(doc, NodeType.TEXT, loc);
    this.value = typeof value === 'string' && escaping
      ? unescapeText(value)
      : value;
    this.escaping = escaping;
  }

  toJSON(): object {
    return {
      type: this.nodeType,
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

  clone(parent: ServerElement | null): ServerText {
    const ret = new ServerText(this.doc, this.value, this.loc, this.escaping);
    parent && parent.appendChild(ret); // ret.linkTo(parent);
    return ret;
  }
}

export class ServerComment extends ServerNode {
  value: string;

  constructor(
    doc: ServerDocument | null,
    value: string,
    loc: SourceLocation
  ) {
    super(doc, NodeType.COMMENT, loc);
    this.value = value;
  }

  toJSON(): object {
    return {
      type: this.nodeType,
      value: this.value,
      loc: this.doc?.jsonLoc ? this.loc : null
    };
  }

  toMarkup(ret: string[]): void {
    ret.push('<!--');
    ret.push(this.value);
    ret.push('-->');
  }

  clone(parent: ServerElement | null): ServerComment {
    const ret = new ServerComment(this.doc, this.value, this.loc);
    parent && parent.appendChild(ret); // ret.linkTo(parent);
    return ret;
  }
}

export class ServerAttribute extends ServerNode implements Attribute {
  name: string;
  value: string | acorn.Expression | null;
  valueLoc?: SourceLocation;
  quote?: string;

  constructor(
    doc: ServerDocument | null,
    parent: ServerElement | null,
    name: string,
    value: string | acorn.Expression | null,
    loc: SourceLocation
  ) {
    super(doc, NodeType.ATTRIBUTE, loc);
    this.name = name;
    this.value = value;
    parent && parent.attributes.push(this);
  }

  toJSON(): object {
    return {
      type: this.nodeType,
      name: this.name,
      value: this.value,
      quote: this.quote,
      loc: this.doc?.jsonLoc ? this.loc : null
    };
  }

  toMarkup(ret: string[]): void {
    if (this.value !== null && typeof this.value !== 'string') {
      return;
    }
    const q = this.quote ?? '"';
    ret.push(' ');
    ret.push(this.name);
    if (this.value === null) {
      return;
    }
    ret.push('=');
    ret.push(q);
    ret.push(escape(this.value as string, '&<' + q));
    ret.push(q);
  }

  clone(parent: ServerElement | null): ServerAttribute {
    const ret = new ServerAttribute(this.doc, parent, this.name, this.value, this.loc);
    ret.valueLoc = this.valueLoc;
    ret.quote = this.quote;
    return ret;
  }
}

export class ServerElement extends ServerNode implements Element {
  tagName: string;
  children: Node[];
  attributes: Attribute[];

  constructor(
    doc: ServerDocument | null,
    name: string,
    loc: SourceLocation
  ) {
    super(doc, NodeType.ELEMENT, loc);
    this.tagName = name.toUpperCase();
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

  setAttribute(name: string, value: string | null) {
    let a = this.getAttributeNode(name);
    if (a) {
      a.value = value;
      return;
    }
    a = new ServerAttribute(this.doc, this, name, value, this.loc);
  }

  removeAttribute(name: string) {
    const attr = this.getAttributeNode(name);
    attr && this.delAttributeNode(attr);
  }

  toJSON(): object {
    return {
      type: this.nodeType,
      name: this.tagName,
      attributes: this.attributes,
      children: this.children,
      loc: this.doc?.jsonLoc ? this.loc : null
    };
  }

  toMarkup(ret: string[]): void {
    if (this.tagName.startsWith(DIRECTIVE_TAG_PREFIX)) {
      return;
    }
    ret.push('<');
    ret.push(this.tagName.toLowerCase());
    this.attributes.forEach(a => (a as ServerAttribute).toMarkup(ret));
    ret.push('>');
    if (VOID_ELEMENTS.has(this.tagName)) {
      return;
    }
    this.children.forEach(n => (n as ServerNode).toMarkup(ret));
    ret.push('</');
    ret.push(this.tagName.toLowerCase());
    ret.push('>');
  }

  clone(parent: ServerElement | null): ServerElement {
    const ret = new ServerElement(this.doc, this.tagName, this.loc);
    parent && parent.appendChild(ret);// ret.linkTo(parent);
    this.attributes.forEach(a => (a as ServerAttribute).clone(ret));
    this.children.forEach(n => (n as ServerNode).clone(ret));
    return ret;
  }
}

export class ServerDocument extends ServerElement implements Document {
  jsonLoc = true;
  domIdElements: ServerElement[] = [];

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
    this.nodeType = NodeType.DOCUMENT;
  }

  get documentElement(): ServerElement | null {
    for (const e of this.children) {
      if (e.nodeType === NodeType.ELEMENT) {
        return e as ServerElement;
      }
    }
    return null;
  }

  get head(): ServerElement | null {
    const root = this.documentElement;
    if (root) {
      for (const e of root.children ?? []) {
        if (e.nodeType === NodeType.ELEMENT && (e as ServerElement).tagName === 'HEAD') {
          return e as ServerElement;
        }
      }
    }
    return null;
  }

  get body(): ServerElement | null {
    const root = this.documentElement;
    if (root) {
      for (const e of root.children ?? []) {
        if (e.nodeType === NodeType.ELEMENT && (e as ServerElement).tagName === 'BODY') {
          return e as ServerElement;
        }
      }
    }
    return null;
  }

  toJSON(): object {
    return {
      type: this.nodeType,
      children: this.children,
      loc: this.jsonLoc ? this.loc : null
    };
  }

  toMarkup(ret: string[]): void {
    for (const n of this.children) {
      if (n.nodeType === NodeType.ELEMENT) {
        (n as ServerNode).toMarkup(ret);
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
