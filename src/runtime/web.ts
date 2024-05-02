import * as core from './core';

export class Context extends core.Context {
  win: Window;
  doc: Document;

  constructor(win: Window, doc: Document) {
    super();
    this.win = win;
    this.doc = doc;
  }

  override newValue(
    scope: core.Scope,
    fn: core.ValueFunction,
    refs?: core.RefFunction[]
  ): core.Value {
    //TODO: web-specific callback
    return new core.Value(scope, fn, refs);
  }
}
