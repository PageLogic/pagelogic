import { Program, Node } from "acorn";
import { JSXClosingElement, JSXElement, JSXOpeningElement } from "./walker";

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

export function addJSXAttribute(
  node: JSXOpeningElement, name: string, value: string
) {
  node.attributes.push({
    type: 'JSXAttribute',
    name: {
      type: 'JSXIdentifier',
      name: name,
      start: node.start, end: node.end, loc: node.loc
    },
    value: {
      type: 'Literal',
      value: value,
      start: node.start, end: node.end, loc: node.loc
    },
    start: node.start, end: node.end, loc: node.loc
  });
}

export function getJSXElementName(
  node: JSXOpeningElement | JSXClosingElement
) {
  const name = node.name;
  if (name.type === 'JSXIdentifier') {
    return name.name;
  } else {
    return `${name.namespace.name}:${name.name.name}`;
  }
}

// export class Stack<T> {
//   stack: T[];

//   constructor() {
//     this.stack = [];
//   }

//   get length(): number {
//     return this.stack.length;
//   }

//   push(item: T): number {
//     return this.stack.push(item);
//   }

//   pop(): T | undefined {
//     return this.stack.pop();
//   }

//   peek(): T | undefined {
//     return this.stack.length > 0
//         ? this.stack[this.stack.length - 1]
//         : undefined;
//   }
// }
