import { Expression, Literal, Node } from "acorn";
import walk from 'acorn-walk';

require('acorn-jsx-walk').extend(walk.base);
export const walker = walk;

export interface JSXElement extends Node {
  type: 'JSXElement';
  openingElement: JSXOpeningElement;
  closingElement: JSXClosingElement;
  children: Node[];
}

export interface JSXOpeningElement extends Node {
  type: 'JSXOpeningElement';
  attributes: JSXAttribute[];
  name: JSXIdentifier | JSXNamespacedName;
  selfClosing?: boolean;
}

export interface JSXClosingElement extends Node {
  type: 'JSXClosingElement';
  name: JSXIdentifier | JSXNamespacedName;
}

export interface JSXAttribute extends Node {
  type: 'JSXAttribute';
  name: JSXIdentifier;
  value: Literal | JSXExpressionContainer;
}

export interface JSXExpressionContainer extends Node {
  type: 'JSXExpressionContainer',
  expression: Expression;
}

export interface JSXIdentifier extends Node {
  type: 'JSXIdentifier';
  name: string;
}

export interface JSXNamespacedName extends Node {
  type: 'JSXNamespacedName';
  namespace: JSXIdentifier;
  name: JSXIdentifier;
}

export interface JSXText extends Node {
  type: 'JSXText';
  value: string;
}
