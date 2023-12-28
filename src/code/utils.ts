import { Program, Node, ObjectExpression, Expression, Property, Identifier, ArrayExpression, Literal, FunctionExpression } from "acorn";
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

export function object(ref: Node): ObjectExpression {
  return {
    type: 'ObjectExpression',
    properties: [],
    start: ref.start, end: ref.end, loc: ref.loc
  }
}

export function property(key: string, val: Expression, ref: Node): Property {
  return {
    type: 'Property',
    method: false,
    shorthand: false,
    computed: false,
    key: identifier(key, ref),
    value: val,
    kind: 'init',
    start: ref.start, end: ref.end, loc: ref.loc
  }
}

export function identifier(key: string, ref: Node): Identifier {
  return {
    type: 'Identifier',
    name: key,
    start: ref.start, end: ref.end, loc: ref.loc
  }
}

export function array(ref: Node): ArrayExpression {
  return {
    type: 'ArrayExpression',
    elements: [],
    start: ref.start, end: ref.end, loc: ref.loc
  }
}

export function literal(value: any, ref: Node): Literal {
  return {
    type: 'Literal',
    value,
    start: ref.start, end: ref.end, loc: ref.loc
  }
}

export function fnExpression(exp: Literal | Expression, ref: Node): FunctionExpression {
  return {
    type: 'FunctionExpression',
    expression: false,
    generator: false,
    async: false,
    params: [],
    body: {
      type: 'BlockStatement',
      body: [
        {
          type: 'ReturnStatement',
          argument: exp,
          start: ref.start, end: ref.end, loc: ref.loc
        }
      ],
      start: ref.start, end: ref.end, loc: ref.loc
    },
    start: ref.start, end: ref.end, loc: ref.loc
  }
}
