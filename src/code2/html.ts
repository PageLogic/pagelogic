import { SourceLocation } from "acorn";
import { CodeError } from "./error";

export type HtmlType = 'node' | 'text' | 'comment' | 'element' | 'attribute' | 'document';

export abstract class HtmlNode {
  doc: HtmlDocument | null;
  parent: HtmlElement | null;
  type: HtmlType;
  loc: SourceLocation;

  constructor(
    doc: HtmlDocument | null,
    parent: HtmlElement | null,
    type: HtmlType,
    loc: SourceLocation
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
  value: string;

  constructor(
    doc: HtmlDocument | null,
    parent: HtmlElement | null,
    value: string,
    loc: SourceLocation
  ) {
    super(doc, parent, 'text', loc);
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

export class HtmlComment extends HtmlNode {
  value: string;

  constructor(
    doc: HtmlDocument | null,
    parent: HtmlElement | null,
    value: string,
    loc: SourceLocation
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
  value: string;
  quote?: string;

  constructor(
    doc: HtmlDocument | null,
    parent: HtmlElement,
    name: string,
    value: string,
    loc: SourceLocation
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
    loc: SourceLocation
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

  constructor(loc: SourceLocation) {
    super(null, null, '#document', loc);
    this.doc = this;
    this.type = 'document';
    this.errors = [];
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
