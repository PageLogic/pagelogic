import { Program, Node } from "acorn";
import { JSXElement, JSXOpeningElement } from "./walker";

export function getJSXAttribute(
  node: JSXOpeningElement, name: string
): string | undefined {
  for (let attr of node.attributes) {
    if (
      attr.type === 'JSXAttribute' &&
      attr.value?.type === 'Literal'
    ) {
      if (attr.name.name === name) {
        return attr.value.value as string;
      }
    }
  }
}

export class Stack<T> {
  stack: T[];

  constructor() {
    this.stack = [];
  }

  get length(): number {
    return this.stack.length;
  }

  push(item: T): number {
    return this.stack.push(item);
  }

  pop(): T | undefined {
    return this.stack.pop();
  }

  peek(): T | undefined {
    return this.stack.length > 0
        ? this.stack[this.stack.length - 1]
        : undefined;
  }
}
