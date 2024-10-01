
export interface Node {
  doc: Document | null;
  parent: Element | null;
  type: unknown;
  loc: unknown;

  unlink(): void;
}

export interface Text extends Node {
  value: unknown;
}

export interface Comment extends Node {
  value: unknown;  
}

export interface Element extends Node {
  name: string;
  children: Node[];

  appendChild(n: Node): Node;
  insertBefore(n: Node, ref: Node | null): Node;
  setAttribute(name: string, value: string): void;
}

export interface Attribute extends Node {
  name: string;
  value: unknown;  
  valueLoc?: unknown;
}

export interface Document extends Element {
  // documentElement: Element | null;
}
