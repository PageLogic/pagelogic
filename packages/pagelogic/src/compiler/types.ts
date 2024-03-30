import * as acorn from 'acorn';
import * as html from './html';
import { Logic } from './logic';

export class Source {
  doc?: html.Document;
  logic?: Logic;
  ast?: acorn.ObjectExpression;
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
