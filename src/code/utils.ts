import { Program, Node } from "acorn";
import { JSXElement } from "./types";

export function getJSXAttribute(node: JSXElement, name: string): string | undefined {
  for (let attr of node.attributes) {
    if (
      attr.type === 'JSXAttribute' &&
      attr.value?.type === 'StringLiteral'
    ) {
      if (attr.name.name === name) {
        return attr.value.value;
      }
    }
  }
}
