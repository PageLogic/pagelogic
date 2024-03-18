import * as acorn from 'acorn';
import * as html from './html';
import { Logic } from './logic';

export class Source {
  doc?: html.Document;
  logic?: Logic;
  files: string[];
  errors: Error[];

  constructor() {
    this.files = [];
    this.errors = [];
  }

  addError(type: ErrorType, msg: string, loc?: acorn.SourceLocation) {
    this.errors.push(new Error(type, msg, loc));
  }
}

export type ErrorType = 'error' | 'warning';

export class Error {
  type: 'error' | 'warning';
  msg: string;
  loc?: acorn.SourceLocation;

  constructor(
    type: ErrorType,
    msg: string,
    loc: acorn.SourceLocation | null | undefined
  ) {
    this.type = type;
    this.msg = msg;
    this.loc = loc ?? undefined;
  }
}

// export interface CodeLogic {
//   page: Source;
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
