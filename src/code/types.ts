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

// export interface CodeLogic {
//   page: CodeSource;
//   root?: CodeScope;
// }

// export interface CodeScope {
//   id: number;
//   name?: string;
//   isolate?: boolean;
//   children: CodeScope[];
//   values: { [key: string]: CodeValue };
//   node: Node;
// }

// export interface CodeValue {
//   val: string,
//   node: Node;
// }
