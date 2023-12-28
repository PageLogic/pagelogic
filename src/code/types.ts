import { Node, Program } from "acorn";

export interface CodeSource {
  ast?: Program;
  files: string[];
  errors: CodeError[];
}

export type CodeErrorType = 'error' | 'warning';

export class CodeError {
  type: 'error' | 'warning';
  msg: string;
  from?: Node;

  constructor(type: CodeErrorType, msg: string, from?: Node) {
    this.type = type;
    this.msg = msg;
    this.from = from;
  }
}

export interface JSXElement extends Node {
  type: 'JSXElement';
  openingElement: any;
  attributes: JSXAttribute[];
  children: Node[];
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