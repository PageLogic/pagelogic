import { Program, Node } from "acorn";
import { JSXElement } from "./walker";

export function getJSXAttribute(node: JSXElement, name: string): string | undefined {
  for (let attr of node.attributes) {
    if (
      attr.type === 'JSXAttribute' &&
      attr.value?.type === 'Literal'
    ) {
      if (attr.name.name === name) {
        return attr.value.value;
      }
    }
  }
}
