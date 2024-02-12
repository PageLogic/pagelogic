import { Expression, Node, Position, SourceLocation } from "acorn";
import { CodeError } from "./types";
import { htmlUnescape } from "./html-parser";

export type HtmlType = 'node' | 'text' | 'comment' | 'element' | 'attribute' | 'document';

export interface HtmlLocation extends SourceLocation {
  i1: number;
  i2: number;
}

export abstract class HtmlNode {
  doc: HtmlDocument | null;
  parent: HtmlElement | null;
  type: HtmlType;
  loc: HtmlLocation;

  constructor(
    doc: HtmlDocument | null,
    parent: HtmlElement | null,
    type: HtmlType,
    loc: HtmlLocation
  ) {
    this.doc = doc;
    this.parent = null;
    this.type = type;
    this.loc = loc;
    parent && this.linkTo(parent);
  }

  linkTo(parent: HtmlElement) {
    this.parent && this.unlink();
    this.parent = parent;
    parent.children.push(this);
  }

  unlink() {
    if (this.parent) {
      const i = this.parent.children.indexOf(this);
      i >= 0 && this.parent.children.splice(i, 1);
      this.parent = null;
    }
  }

  toJSON() {
    return {
      type: this.type,
      loc: this.doc?.jsonLoc ? this.loc : null,
    }
  }
}

export class HtmlText extends HtmlNode {
  value: string | Expression;

  constructor(
    doc: HtmlDocument | null,
    parent: HtmlElement | null,
    value: string | Expression,
    loc: HtmlLocation
  ) {
    super(doc, parent, 'text', loc);
    this.value = typeof value === 'string'
        ? htmlUnescape(value)
        : value;
  }

  toJSON() {
    return {
      type: this.type,
      value: this.value,
      loc: this.doc?.jsonLoc ? this.loc : null,
    }
  }
}

export class HtmlComment extends HtmlNode {
  value: string;

  constructor(
    doc: HtmlDocument | null,
    parent: HtmlElement | null,
    value: string,
    loc: HtmlLocation
  ) {
    super(doc, parent, 'comment', loc);
    this.value = value;
  }

  toJSON() {
    return {
      type: this.type,
      value: this.value,
      loc: this.doc?.jsonLoc ? this.loc : null,
    }
  }
}

export class HtmlAttribute extends HtmlNode {
  name: string;
  value: string | Expression;
  quote?: string;

  constructor(
    doc: HtmlDocument | null,
    parent: HtmlElement,
    name: string,
    value: string,
    loc: HtmlLocation
  ) {
    super(doc, null, 'attribute', loc);
    this.parent = parent;
    this.name = name;
    this.value = value;
    parent && parent.attributes.push(this);
  }

  toJSON() {
    return {
      type: this.type,
      name: this.name,
      value: this.value,
      quote: this.quote,
      loc: this.doc?.jsonLoc ? this.loc : null,
    }
  }
}

export class HtmlElement extends HtmlNode {
  name: string;
  children: HtmlNode[];
  attributes: HtmlAttribute[];

  constructor(
    doc: HtmlDocument | null,
    parent: HtmlElement | null,
    name: string,
    loc: HtmlLocation
  ) {
    super(doc, parent, 'element', loc);
    this.name = name.toUpperCase();
    this.children = [];
    this.attributes = [];
  }

  toJSON() {
    return {
      type: this.type,
      name: this.name,
      attributes: this.attributes,
      children: this.children,
      loc: this.doc?.jsonLoc ? this.loc : null,
    }
  }
}

export class HtmlDocument extends HtmlElement {
  errors: CodeError[];
  jsonLoc = true;

  constructor(loc: HtmlLocation) {
    super(null, null, '#document', loc);
    this.doc = this;
    this.type = 'document';
    this.errors = [];
  }

  get documentElement(): HtmlElement | null {
    for (const e of this.children) {
      if (e.type === 'element') {
        return e as HtmlElement;
      }
    }
    return null;
  }

  toJSON(): any {
    return {
      type: this.type,
      errors: this.errors,
      children: this.children,
      loc: this.jsonLoc ? this.loc : null,
    }
  }
}
