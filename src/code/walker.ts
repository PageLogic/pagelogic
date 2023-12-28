import { Node } from "acorn";
import walk from 'acorn-walk';
require('acorn-jsx-walk').extend(walk.base);
export const walker = walk;

export interface JSXElement extends Node {
  type: 'JSXElement';
  openingElement: any;
  attributes: JSXAttribute[];
  children: Node[];
}

export interface JSXOpeningElement extends Node {
  
}

export interface JSXAttribute extends Node {
  type: 'JSXAttribute';
  name: JSXIdentifier;
  value: any;
}

export interface JSXIdentifier extends Node {
  type: 'JSXIdentifier';
  name: string;
}

export interface JSXText extends Node {
  type: 'JSXText';
  value: string;
}
