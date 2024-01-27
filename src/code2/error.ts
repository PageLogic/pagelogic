import { Position, SourceLocation } from "acorn";

export type CodeErrorType = 'error' | 'warning';

export class CodeError {
  type: 'error' | 'warning';
  msg: string;
  pos: Position;

  constructor(type: CodeErrorType, msg: string, pos: Position) {
    this.type = type;
    this.msg = msg;
    this.pos = pos;
  }

  toJSON(): any {
    return {
      type: this.type,
      msg: this.msg,
      pos: this.pos
    };
  }
}
