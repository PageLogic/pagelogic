export const NodeType = {
  ELEMENT: 1,
  ATTRIBUTE: 2,
  TEXT: 3,
  COMMENT: 8,
  DOCUMENT: 9,
};

export interface Node {
  ownerDocument: Document | null;
  parent: Element | null;
  nodeType: unknown;
  loc: unknown;

  unlink(): void;
}

export interface Text extends Node {
  textContent: unknown;
}

export interface Comment extends Node {
  textContent: string;
}

export interface Element extends Node {
  tagName: string;
  childNodes: Node[];

  appendChild(n: Node): Node;
  insertBefore(n: Node, ref: Node | null): Node;
  setAttribute(name: string, value: string): void;
  addEventListener(evname: string, listener: unknown): void;
  removeEventListener(evname: string, listener: unknown): void;
}

export interface Attribute extends Node {
  name: string;
  value: unknown;
  valueLoc?: unknown;
}

export interface Document extends Element {
  // documentElement: Element | null;
  createTextNode(text: string): Text;
}
